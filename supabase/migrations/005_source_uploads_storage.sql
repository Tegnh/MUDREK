-- ============================================================================
-- مُدرِك — مخزن ملفات المصادر (Supabase Storage)
--
-- سبب وجود هذه الهجرة: الملف كان يُرسَل داخل جسم الـ Server Action نفسه، وهو
-- مسار محكوم بسقفين لا حيلة للتطبيق فيهما:
--   ١) سقف Next.js لأجسام الـ Server Actions — ١ ميجابايت افتراضيًا.
--   ٢) سقف منصة Vercel لجسم أي طلب يصل إلى Function — ٤٫٥ ميجابايت، ولا
--      يُرفَع بإعداد في المشروع إطلاقًا.
-- رفع السقف الأول وحده كان يبدّل خطأ ١ ميجابايت بخطأ ٤٫٥ لا أكثر. لذلك صار
-- المتصفح يرفع الملف مباشرة إلى هذا المخزن عبر رابط موقّع، ولا يعبر الخادمَ
-- إلا مسارُ الملف — بضع عشرات من البايتات.
--
-- الدلو خاص (public = false): لا شيء هنا مقروء برابط مباشر، والخادم وحده
-- يقرأه بمفتاح service_role وقت المعالجة ثم يحذفه.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ١) الدلو
--
-- file_size_limit يُطبَّق في Storage نفسه لا في الواجهة: فحص الحجم في
-- المتصفح رسالةٌ لطيفة للمستخدم، وهذا السطر هو الحدّ الفعلي الذي لا يُتجاوز
-- حتى لو نُودي على الواجهة برمجيًا.
--
-- ولا يُضبط allowed_mime_types عمدًا: نوعُ المحتوى هنا يأتي مما يُصرّح به
-- المتصفح، وهو يُرسل application/octet-stream لملفات .md و.pptx على أنظمة
-- كثيرة — فقائمةٌ بيضاء في هذا الموضع كانت سترفض ملفات مدعومة فعلًا وتترك
-- الطالب أمام خطأ لا سبب ظاهر له. البوّابة الحقيقية للنوع قبل ذلك: الخادم
-- لا يُصدر رابطًا موقّعًا أصلًا إلا لنوع مدعوم (app/s/upload/actions.ts)،
-- ثم يفحصه ثانيةً عند المعالجة.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('sources', 'sources', false, 26214400) -- ٢٥ ميجابايت
on conflict (id) do update
set
  public          = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- ----------------------------------------------------------------------------
-- ٢) السياسات
--
-- الرفع الفعلي يجري برابط موقّع يُصدره الخادم بمفتاح service_role، وهو يتجاوز
-- RLS أصلًا — فهذه السياسات ليست هي ما يُجيز الرفع، بل ما يمنع كل ما عداه:
-- بدونها يبقى الدلو مغلقًا على أي عميل، ومعها يرى كلُّ طالب مجلَّده وحده
-- (المجلَّد الأول في المسار = معرّف المستخدم).
--
-- storage.foldername('uid/abc.pdf') تُعيد {uid}، فالمقارنة أدناه على أول
-- مقطع من المسار لا على المسار كاملًا.
-- ----------------------------------------------------------------------------

drop policy if exists "sources_insert_own" on storage.objects;
create policy "sources_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "sources_select_own" on storage.objects;
create policy "sources_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "sources_delete_own" on storage.objects;
create policy "sources_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
