-- ============================================================================
-- مسار كلمة المرور + الدور كمُطالبة (claim) في التوكن
--
-- سببان دفعا لهذه الهجرة:
--
-- ١) إرسال البريد غير موثوق في هذه البيئة، فأُضيف مسار "بريد + كلمة مرور"
--    إلى جانب Magic Link. إنشاء الحساب يمرّ بـ admin.createUser، وهو مسار
--    إدراج آخر في auth.users — فيجب أن يحتمله مشغّل handle_new_auth_user
--    دون أن يفشل على صفّ موجود مسبقًا (مستخدم سجّل سابقًا برابط دخول ثم
--    أضاف كلمة مرور).
--
-- ٢) كان middleware يستعلم public.users عن الدور في *كل* طلب محمي — رحلة
--    ذهاب وإياب إلى قاعدة البيانات قبل عرض أي صفحة. الدور يُنسخ هنا إلى
--    auth.users.raw_app_meta_data ليصل داخل التوكن نفسه، فيقرأه middleware
--    من الجلسة بلا استعلام.
--
--    لماذا app_metadata لا user_metadata: الأخيرة يعدّلها المستخدم بنفسه
--    عبر auth.updateUser، فلا تصلح أساسًا للتوجيه حسب الدور. app_metadata
--    لا تُكتب إلا بمفتاح service_role أو من داخل القاعدة — كما هنا.
--
--    يبقى public.users هو المرجع، وRLS كلها ما زالت تقرأ منه؛ هذه نسخة
--    للقراءة السريعة في طبقة التوجيه فقط.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ١) مشغّل إنشاء المستخدم: يحتمل التكرار
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
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
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  -- الصفّ قد يكون موجودًا (إنشاء عبر لوحة Supabase، أو إعادة محاولة).
  -- الدور تحديدًا لا يُحدَّث هنا: prevent_role_change هو من يحرسه.
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- ٢) مزامنة الدور إلى app_metadata
-- ----------------------------------------------------------------------------

create or replace function public.sync_role_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role::text)
  where id = new.id;
  return new;
end;
$$;

create trigger users_sync_role_to_app_metadata
  after insert or update of role on public.users
  for each row execute function public.sync_role_to_app_metadata();

-- تعبئة الحسابات القائمة (الجديد يتكفّل به المشغّل أعلاه).
update auth.users a
set raw_app_meta_data =
  coalesce(a.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', u.role::text)
from public.users u
where u.id = a.id
  and coalesce(a.raw_app_meta_data ->> 'role', '') is distinct from u.role::text;

-- ----------------------------------------------------------------------------
-- ٣) إصلاح أثري: مستخدمو auth بلا صفّ في public.users
--
-- أي حساب أُنشئ قبل المشغّل أو فشل إدراجه يبقى بلا ملف تعريف، فتنكسر له كل
-- صفحة تقرأ users.role — يدخل ولا يجد لوحة. تُستدرك هنا مرة واحدة، ويتكفّل
-- ensureProfile في lib/auth/session.ts بأي حالة لاحقة أثناء التشغيل.
-- ----------------------------------------------------------------------------

insert into public.users (id, email, role, name)
select
  a.id,
  a.email,
  coalesce((a.raw_user_meta_data ->> 'role')::public.user_role, 'student'),
  coalesce(nullif(trim(a.raw_user_meta_data ->> 'name'), ''), split_part(a.email, '@', 1))
from auth.users a
left join public.users u on u.id = a.id
where u.id is null and a.email is not null
on conflict (id) do nothing;
