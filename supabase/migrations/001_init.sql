-- ============================================================================
-- مُدرِك — المخطط الأساسي
-- جدول misconceptions هو الجسر المشترك بين مسار المعلم (diagnoses) ومسار
-- الطالب (attempts). لا يُكرَّر ولا يُفصَل عن أي منهما.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- الأنواع (enums)
-- ----------------------------------------------------------------------------

create type public.user_role as enum ('teacher', 'student');
create type public.submission_status as enum ('pending', 'processing', 'completed', 'failed');
create type public.source_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.quiz_mode as enum ('auto', 'custom');
create type public.reminder_type as enum ('not_started', 'incomplete');

-- ----------------------------------------------------------------------------
-- الجداول
-- ----------------------------------------------------------------------------

-- users: مرآة عامة لـ auth.users، تُملأ تلقائيًا عبر المشغّل أدناه.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'student',
  name text not null,
  created_at timestamptz not null default now()
);

create function public.generate_join_code()
returns text
language sql
volatile
as $$
  select upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
$$;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  subject text not null,
  join_code text not null unique default public.generate_join_code()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  unique (class_id, student_id)
);

-- misconceptions: قاموس مفاهيم مغلوطة مشترك بين نافذتي المعلم والطالب.
create table public.misconceptions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  outcome_code text not null,
  label text not null,
  description text,
  unique (subject, outcome_code)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

-- submissions: المعلم من يرفع ورقة إجابة كل طالب (مسح ضوئي)، لا الطالب.
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  image_url text not null,
  status public.submission_status not null default 'pending',
  unique (exam_id, student_id)
);

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  question_no integer not null check (question_no > 0),
  extracted_text text,
  is_correct boolean not null,
  misconception_id uuid references public.misconceptions (id),
  confidence numeric(4, 3) check (confidence between 0 and 1),
  teacher_approved boolean not null default false,
  unique (submission_id, question_no)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  filename text not null,
  file_url text not null,
  status public.source_status not null default 'pending'
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  order_no integer not null check (order_no > 0),
  title text not null,
  content_md text,
  is_locked boolean not null default true,
  unique (source_id, order_no)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  mode public.quiz_mode not null default 'auto',
  questions_json jsonb not null default '[]'::jsonb
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  answers_json jsonb not null default '[]'::jsonb,
  score numeric(5, 2) not null check (score >= 0),
  misconception_id uuid references public.misconceptions (id),
  created_at timestamptz not null default now()
);

create table public.streaks (
  student_id uuid primary key references public.users (id) on delete cascade,
  current integer not null default 0 check (current >= 0),
  longest integer not null default 0 check (longest >= 0),
  last_active_date date
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  sent_at timestamptz not null default now(),
  type public.reminder_type not null
);

-- ----------------------------------------------------------------------------
-- فهارس المفاتيح الأجنبية
-- ----------------------------------------------------------------------------

create index classes_teacher_id_idx on public.classes (teacher_id);
create index enrollments_class_id_idx on public.enrollments (class_id);
create index enrollments_student_id_idx on public.enrollments (student_id);
create index exams_class_id_idx on public.exams (class_id);
create index submissions_exam_id_idx on public.submissions (exam_id);
create index submissions_student_id_idx on public.submissions (student_id);
create index diagnoses_submission_id_idx on public.diagnoses (submission_id);
create index diagnoses_student_id_idx on public.diagnoses (student_id);
create index diagnoses_misconception_id_idx on public.diagnoses (misconception_id);
create index sources_student_id_idx on public.sources (student_id);
create index sections_source_id_idx on public.sections (source_id);
create index quizzes_section_id_idx on public.quizzes (section_id);
create index attempts_quiz_id_idx on public.attempts (quiz_id);
create index attempts_student_id_idx on public.attempts (student_id);
create index attempts_misconception_id_idx on public.attempts (misconception_id);
create index reminders_student_id_idx on public.reminders (student_id);
create index reminders_section_id_idx on public.reminders (section_id);

-- ----------------------------------------------------------------------------
-- المشغّلات (triggers)
-- ----------------------------------------------------------------------------

-- إنشاء صف public.users تلقائيًا عند تسجيل مستخدم جديد عبر Magic Link.
-- الدور والاسم يُقرآن من raw_user_meta_data التي تُمرَّر مع signInWithOtp.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, name)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- منع تغيير الدور من العميل بعد الإنشاء (لا مسار في الواجهة يبرر ذلك).
create function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role and auth.role() <> 'service_role' then
    raise exception 'changing role is not allowed';
  end if;
  return new;
end;
$$;

create trigger users_prevent_role_change
  before update on public.users
  for each row execute function public.prevent_role_change();

-- diagnoses.student_id مكرَّر عمدًا لتبسيط RLS، لكن يجب أن يطابق دائمًا
-- صاحب الـ submission — وإلا ينكسر ضمان "لا يرى الطالب تشخيصات زملائه".
create function public.enforce_diagnosis_student()
returns trigger
language plpgsql
as $$
declare
  v_student uuid;
begin
  select student_id into v_student from public.submissions where id = new.submission_id;
  if v_student is null then
    raise exception 'submission % not found', new.submission_id;
  end if;
  if new.student_id <> v_student then
    raise exception 'diagnoses.student_id must match submissions.student_id';
  end if;
  return new;
end;
$$;

create trigger diagnoses_student_consistency
  before insert or update on public.diagnoses
  for each row execute function public.enforce_diagnosis_student();

-- ----------------------------------------------------------------------------
-- دوال مساعدة لسياسات RLS
--
-- SECURITY DEFINER هنا مقصودة وضرورية: هذه الدوال تُستدعى من داخل سياسات
-- جداول أخرى (classes تستدعي enrolled_in_class التي تقرأ enrollments، التي
-- بدورها قد تستدعي teaches_class التي تقرأ classes...). لو بقيت الدوال
-- SECURITY INVOKER لأعيد تطبيق RLS على كل استعلام داخلي، فيتشكّل تكرار
-- متبادل بين سياستَي classes وenrollments. كل دالة هنا محصورة صراحةً
-- بـ auth.uid()، فلا خطر أمني من تجاوزها لـ RLS.
-- ----------------------------------------------------------------------------

create function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'teacher'
  );
$$;

create function public.teaches_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes where id = p_class_id and teacher_id = auth.uid()
  );
$$;

create function public.enrolled_in_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = p_class_id and student_id = auth.uid()
  );
$$;

-- مسار انضمام الطالب: يحلّ رمز الانضمام إلى فصل ويسجّله فيه، متجاوزًا RLS
-- على classes لهذه الخطوة فقط (الطالب لا يملك صلاحية SELECT على فصل لم
-- ينضمّ إليه بعد).
create function public.join_class_by_code(p_join_code text)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes;
begin
  select * into v_class from public.classes where join_code = p_join_code;
  if v_class.id is null then
    raise exception 'invalid join code';
  end if;

  insert into public.enrollments (class_id, student_id)
  values (v_class.id, auth.uid())
  on conflict (class_id, student_id) do nothing;

  return v_class;
end;
$$;

grant execute on function public.join_class_by_code(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.misconceptions enable row level security;
alter table public.exams enable row level security;
alter table public.submissions enable row level security;
alter table public.diagnoses enable row level security;
alter table public.sources enable row level security;
alter table public.sections enable row level security;
alter table public.quizzes enable row level security;
alter table public.attempts enable row level security;
alter table public.streaks enable row level security;
alter table public.reminders enable row level security;

-- users -----------------------------------------------------------------

create policy "users select own or roster" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.enrollments e
      join public.classes c on c.id = e.class_id
      where e.student_id = public.users.id and c.teacher_id = auth.uid()
    )
  );

create policy "users insert self" on public.users
  for insert with check (id = auth.uid());

create policy "users update self" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- classes -----------------------------------------------------------------

create policy "classes select own or enrolled" on public.classes
  for select using (
    teacher_id = auth.uid() or public.enrolled_in_class(id)
  );

create policy "classes insert as teacher" on public.classes
  for insert with check (teacher_id = auth.uid() and public.is_teacher());

create policy "classes update own" on public.classes
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "classes delete own" on public.classes
  for delete using (teacher_id = auth.uid());

-- enrollments -----------------------------------------------------------------

create policy "enrollments select own or roster" on public.enrollments
  for select using (
    student_id = auth.uid() or public.teaches_class(class_id)
  );

create policy "enrollments insert self or teacher" on public.enrollments
  for insert with check (
    student_id = auth.uid() or public.teaches_class(class_id)
  );

create policy "enrollments delete by teacher" on public.enrollments
  for delete using (public.teaches_class(class_id));

-- misconceptions ----------------------------------------------------------
-- قاموس للقراءة فقط من العميل؛ الكتابة عبر service_role (الهجرات/اللوحة).

create policy "misconceptions select all authenticated" on public.misconceptions
  for select to authenticated using (true);

-- exams -----------------------------------------------------------------

create policy "exams select roster" on public.exams
  for select using (
    public.teaches_class(class_id) or public.enrolled_in_class(class_id)
  );

create policy "exams write by teacher" on public.exams
  for insert with check (public.teaches_class(class_id));

create policy "exams update by teacher" on public.exams
  for update using (public.teaches_class(class_id)) with check (public.teaches_class(class_id));

create policy "exams delete by teacher" on public.exams
  for delete using (public.teaches_class(class_id));

-- submissions -----------------------------------------------------------------
-- المعلم يرفع صورة ورقة إجابة كل طالب؛ الطالب يقرأ نتيجته فقط.

create policy "submissions select own or teacher" on public.submissions
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.exams x where x.id = exam_id and public.teaches_class(x.class_id))
  );

create policy "submissions insert by teacher" on public.submissions
  for insert with check (
    exists (select 1 from public.exams x where x.id = exam_id and public.teaches_class(x.class_id))
  );

create policy "submissions update by teacher" on public.submissions
  for update using (
    exists (select 1 from public.exams x where x.id = exam_id and public.teaches_class(x.class_id))
  ) with check (
    exists (select 1 from public.exams x where x.id = exam_id and public.teaches_class(x.class_id))
  );

create policy "submissions delete by teacher" on public.submissions
  for delete using (
    exists (select 1 from public.exams x where x.id = exam_id and public.teaches_class(x.class_id))
  );

-- diagnoses -----------------------------------------------------------------
-- student_id = auth.uid() هو ما يمنع الطالب من رؤية تشخيصات زملائه.

create policy "diagnoses select own or teacher" on public.diagnoses
  for select using (
    student_id = auth.uid()
    or exists (
      select 1 from public.submissions s
      join public.exams x on x.id = s.exam_id
      where s.id = submission_id and public.teaches_class(x.class_id)
    )
  );

create policy "diagnoses write by teacher" on public.diagnoses
  for insert with check (
    exists (
      select 1 from public.submissions s
      join public.exams x on x.id = s.exam_id
      where s.id = submission_id and public.teaches_class(x.class_id)
    )
  );

create policy "diagnoses update by teacher" on public.diagnoses
  for update using (
    exists (
      select 1 from public.submissions s
      join public.exams x on x.id = s.exam_id
      where s.id = submission_id and public.teaches_class(x.class_id)
    )
  ) with check (
    exists (
      select 1 from public.submissions s
      join public.exams x on x.id = s.exam_id
      where s.id = submission_id and public.teaches_class(x.class_id)
    )
  );

create policy "diagnoses delete by teacher" on public.diagnoses
  for delete using (
    exists (
      select 1 from public.submissions s
      join public.exams x on x.id = s.exam_id
      where s.id = submission_id and public.teaches_class(x.class_id)
    )
  );

-- sources / sections / quizzes -----------------------------------------------------------------
-- ملك الطالب حصرًا. لا وصول للمعلم على هذا المسار إطلاقًا.

create policy "sources all own" on public.sources
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "sections all own" on public.sections
  for all using (
    exists (select 1 from public.sources src where src.id = source_id and src.student_id = auth.uid())
  ) with check (
    exists (select 1 from public.sources src where src.id = source_id and src.student_id = auth.uid())
  );

create policy "quizzes all own" on public.quizzes
  for all using (
    exists (
      select 1 from public.sections sec
      join public.sources src on src.id = sec.source_id
      where sec.id = section_id and src.student_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sections sec
      join public.sources src on src.id = sec.source_id
      where sec.id = section_id and src.student_id = auth.uid()
    )
  );

-- attempts -----------------------------------------------------------------
-- سجلّ ثابت لمحاولات الطالب. لا تعديل بعد الإنشاء، ولا رؤية للمعلم هنا.

create policy "attempts select own" on public.attempts
  for select using (student_id = auth.uid());

create policy "attempts insert own" on public.attempts
  for insert with check (student_id = auth.uid());

-- streaks -----------------------------------------------------------------

create policy "streaks all own" on public.streaks
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- reminders -----------------------------------------------------------------
-- تُنشَأ عبر مهمة مجدولة بمفتاح service_role (يتجاوز RLS)؛ الطالب يقرأ فقط.

create policy "reminders select own" on public.reminders
  for select using (student_id = auth.uid());
