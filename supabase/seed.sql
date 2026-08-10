-- ============================================================================
-- بيانات تجريبية: معلّم واحد، فصل رياضيات (الصف الثاني متوسط)، ٦ طلاب،
-- و١٥ مفهومًا مغلوطًا. يُشغَّل بعد 001_init.sql (عبر `supabase db reset`).
--
-- ملاحظة: إدراج auth.users / auth.identities يدويًا هنا مخصّص للتطوير
-- المحلي فقط، ليحلّ محلّ خطوة Magic Link الفعلية. المشغّل
-- handle_new_auth_user يتكفّل بإنشاء صفوف public.users تلقائيًا من
-- raw_user_meta_data، تمامًا كما يحدث مع مستخدم حقيقي.
-- ============================================================================

do $$
declare
  v_instance uuid := '00000000-0000-0000-0000-000000000000';

  v_teacher uuid := '11111111-1111-1111-1111-111111111111';
  v_class   uuid := '22222222-2222-2222-2222-222222222222';

  v_students uuid[] := array[
    '44444444-4444-4444-4444-444444444441',
    '44444444-4444-4444-4444-444444444442',
    '44444444-4444-4444-4444-444444444443',
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444445',
    '44444444-4444-4444-4444-444444444446'
  ];
  v_student_names text[] := array[
    'سارة العتيبي', 'محمد القحطاني', 'نورة الشهري',
    'عبدالله الدوسري', 'ريم الحربي', 'خالد المطيري'
  ];

  v_id uuid;
  v_email text;
  v_name text;
begin
  -- المعلّم
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    v_instance, v_teacher, 'authenticated', 'authenticated',
    'teacher@mudrik.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', 'أ. فيصل الغامدي', 'role', 'teacher'),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_teacher, v_teacher::text,
    jsonb_build_object('sub', v_teacher::text, 'email', 'teacher@mudrik.test'),
    'email', now(), now(), now()
  );

  -- الطلاب الستة
  for i in 1 .. array_length(v_students, 1) loop
    v_id := v_students[i];
    v_name := v_student_names[i];
    v_email := 'student' || i || '@mudrik.test';

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      v_instance, v_id, 'authenticated', 'authenticated',
      v_email, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_name, 'role', 'student'),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email', now(), now(), now()
    );
  end loop;

  -- الفصل والتسجيل
  insert into public.classes (id, teacher_id, name, subject, join_code)
  values (v_class, v_teacher, 'الرياضيات — الصف الثاني متوسط (فصل أ)', 'الرياضيات', 'MATH8A');

  insert into public.enrollments (class_id, student_id)
  select v_class, s from unnest(v_students) as s;
end $$;

-- المفاهيم المغلوطة — رياضيات، الصف الثاني متوسط (١٥ مفهومًا)
insert into public.misconceptions (subject, outcome_code, label, description) values
  ('الرياضيات', 'G8-INT-01', 'إشارة ضرب عددين سالبين',
    'يظنّ الطالب أن حاصل ضرب عددين صحيحين سالبين عدد سالب.'),
  ('الرياضيات', 'G8-INT-02', 'جمع عددين مختلفي الإشارة',
    'يجمع القيمتين المطلقتين بدل طرحهما عند جمع عدد موجب وآخر سالب.'),
  ('الرياضيات', 'G8-OPS-01', 'ترتيب العمليات الحسابية',
    'ينفّذ الجمع أو الطرح قبل الضرب أو القسمة في تعبير عددي مركّب.'),
  ('الرياضيات', 'G8-ALG-01', 'توزيع الإشارة السالبة على القوس',
    'ينسى تغيير إشارة كل حدّ داخل القوس عند توزيع سالب عليه.'),
  ('الرياضيات', 'G8-ALG-02', 'جمع حدود جبرية غير متشابهة',
    'يجمع حدّين مختلفين في المتغيّر أو الأسّ معتبرًا إيّاهما متشابهين.'),
  ('الرياضيات', 'G8-ALG-03', 'قواعد الأسس عند الضرب',
    'يجمع القاعدتين بدل جمع الأسّين عند ضرب حدّين لهما نفس الأساس.'),
  ('الرياضيات', 'G8-ALG-04', 'الأسّ صفر',
    'يعتقد أن أي عدد مرفوع للأسّ صفر يساوي صفرًا بدل واحد.'),
  ('الرياضيات', 'G8-EQ-01', 'عزل المتغيّر في المعادلة',
    'يطبّق العملية العكسية على طرف واحد من المعادلة فقط.'),
  ('الرياضيات', 'G8-EQ-02', 'نقل حدّ عبر يساوي',
    'ينقل حدًّا من طرف لآخر دون تغيير إشارته.'),
  ('الرياضيات', 'G8-FRAC-01', 'جمع الكسور مختلفة المقام',
    'يجمع البسط مع البسط والمقام مع المقام دون توحيد المقامات أوّلًا.'),
  ('الرياضيات', 'G8-FRAC-02', 'قسمة الكسور',
    'يقسم الكسور مباشرة بدل ضرب الكسر الأول بمقلوب الكسر الثاني.'),
  ('الرياضيات', 'G8-RATIO-01', 'النسبة المئوية مقابل النسبة',
    'يتعامل مع نسبة مثل ٣:٥ كأنها ٣٪ دون تحويلها.'),
  ('الرياضيات', 'G8-GEOM-01', 'مجموع زوايا المثلث',
    'يخطئ في حساب الزاوية الثالثة رغم معرفته أن مجموع الزوايا ١٨٠°.'),
  ('الرياضيات', 'G8-GEOM-02', 'المحيط مقابل المساحة',
    'يستخدم قانون المساحة عند سؤاله عن المحيط، أو العكس.'),
  ('الرياضيات', 'G8-STAT-01', 'الوسط الحسابي',
    'يقسم مجموع القيم على عدد غير صحيح منها، أو ينسى تضمين إحدى القيم.');
