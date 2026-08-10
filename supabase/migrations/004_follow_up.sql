-- ============================================================================
-- مُدرِك — نظام المتابعة (التذكيرات المجدولة)
--
-- المهمة المجدولة تعمل في استدعاء خادمي منفصل تمامًا عن جلسة الطالب، فلا
-- ترى المخزن الذي في الذاكرة (lib/data/store.ts) إطلاقًا — تراه فارغًا كما
-- بُذر أول مرة. لذلك تحتاج المتابعة إلى أثر مُعمَّر في القاعدة مربوط بـ
-- student_id، وهو ما تضيفه هذه الهجرة.
--
-- المضاف هنا سجلّ نشاط مصغّر لا نسخة ثانية من مسار الطالب: الواجهة تبقى على
-- المخزن في الذاكرة إلى حين ترحيلها، وهذا الجدول يحمل ما تحتاجه القواعد
-- الثلاث فقط (متى رُفع ملف، متى فُتح قسم، متى أُجيب سؤال) لا أكثر.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ١) طوابع الإنشاء الناقصة
--
-- sections تُكتب من نافذة المعلم عند إرسال مادة علاجية (انظر
-- app/t/class/[id]/actions.ts)، وقاعدة «فجوة لم يُحلّ تمرينها بعد ٢٤ ساعة»
-- تحتاج لحظة الإرسال — ولم تكن مسجَّلة.
-- ----------------------------------------------------------------------------

alter table public.sources add column if not exists created_at timestamptz not null default now();
alter table public.sections add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- ٢) سجلّ النشاط
--
-- file_ref/section_ref نصّ حرّ لا مفتاح أجنبي: معرّفات المخزن الحالي
-- (file-1001 / sec-1002) ليست UUID ولا صفوفًا في القاعدة. تصبح UUIDs بعد
-- ترحيل مسار الطالب دون تغيير في هذا الجدول ولا في المحرّك الذي يقرأه.
--
-- label يحمل عنوان الملف/القسم وقت الحدث حتى تكتب رسالة التذكير اسمًا
-- مفهومًا دون أن تضطر المهمة المجدولة إلى بلوغ المخزن أصلًا.
-- ----------------------------------------------------------------------------

create type public.activity_kind as enum (
  'source_uploaded',
  'section_opened',
  'question_answered',
  'quiz_completed'
);

create table public.student_activity (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  kind public.activity_kind not null,
  file_ref text,
  section_ref text,
  label text,
  created_at timestamptz not null default now()
);

create index student_activity_student_created_idx
  on public.student_activity (student_id, created_at desc);

-- القاعدة الأولى تسأل: «هل فُتح قسمٌ من هذا الملف؟» — بحث بالنوع والملف معًا.
create index student_activity_kind_file_idx
  on public.student_activity (student_id, kind, file_ref);

alter table public.student_activity enable row level security;

create policy "student_activity select own" on public.student_activity
  for select using (student_id = auth.uid());

create policy "student_activity insert own" on public.student_activity
  for insert with check (student_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ٣) أنواع التذكير الجديدة
--
-- ALTER TYPE ... ADD VALUE مسموح داخل معاملة منذ PG 12، بشرط ألّا تُستعمل
-- القيمة الجديدة في نفس المعاملة — ولا تُستعمل هنا.
-- ----------------------------------------------------------------------------

alter type public.reminder_type add value if not exists 'streak_at_risk';
alter type public.reminder_type add value if not exists 'gap_unresolved';

-- ----------------------------------------------------------------------------
-- ٤) قيد «رسالة واحدة لكل طالب يوميًا»
--
-- المحرّك يفحص هذا قبل الإرسال، لكن الفحص وحده لا يكفي: التشغيل اليدوي من
-- /admin/cron قد يتزامن مع التشغيل المجدول، فيمرّ الاثنان من الفحص قبل أن
-- يكتب أيّهما. الفهرس الفريد هو الحارس الحقيقي، والمحرّك يحجز الصفّ أولًا ثم
-- يرسل — فالتصادم يفشل بلا بريد مكرّر.
--
-- اليوم محسوب بتوقيت الرياض لا UTC: المهمة تعمل ١٨:٠٠ بتوقيت الرياض، و«يوم»
-- بـ UTC كان سيقسم مساء الرياض على تاريخين.
-- ----------------------------------------------------------------------------

alter table public.reminders
  add column if not exists sent_on date not null default (now() at time zone 'Asia/Riyadh')::date;

-- تذكير السلسلة لا يخصّ قسمًا بعينه.
alter table public.reminders alter column section_id drop not null;

-- سبب الإرسال كما قرّره المحرّك — يُقرأ في /admin/cron لتفسير كل رسالة.
alter table public.reminders add column if not exists context text;

create unique index reminders_one_per_student_per_day
  on public.reminders (student_id, sent_on);
