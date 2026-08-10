-- ============================================================================
-- صفحة /t/student/[id] تعرض جسر المسارين على مستوى الطالب الفرد: تشخيصات
-- المعلم (diagnoses) ومحاولات الطالب الذاتية (attempts) جنبًا إلى جنب.
--
-- سياسة 001 على attempts كانت "select own" حصرًا، فلا يرى المعلم شيئًا من
-- محاولات طلابه — وبذلك تصبح نصف الصفحة فارغة دائمًا. تُضاف هنا قراءة
-- واحدة محدودة: معلّم الفصل يقرأ محاولات من هو مسجَّل فعلًا في أحد فصوله.
--
-- ما لا يُمنح عمدًا: لا كتابة ولا حذف على attempts (السجل يبقى ثابتًا)، ولا
-- وصول للمعلم إلى sources/sections/quizzes — أي أن المعلم يرى *نتيجة* محاولة
-- الطالب لا مصادره الدراسية الخاصة.
-- ============================================================================

create function public.teaches_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p_student_id and c.teacher_id = auth.uid()
  );
$$;

create policy "attempts select by teacher of student" on public.attempts
  for select using (public.teaches_student(student_id));
