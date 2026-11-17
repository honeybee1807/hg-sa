"use client";

// "Blog & stories": the story cards (All / Drafts / Published) and the post
// editor. the editor is the classic panel's BlogEditorForm, restyled — same
// fields, same live slug, same 16:9 crop-and-upload, same validation, same
// createBlogPost / updateBlogPost / deleteBlogPost actions. the quick
// "Publish" / "Move to draft" button sends the post's full existing payload
// through updateBlogPost with only "published" flipped, exactly as saving
// it unchanged from the editor would.

import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { DeleteConfirm, EmptyState, InlineFeedback, When } from "./ui";

// same cleanup rules as cleanBlogSlug() in app/admin/actions.js — the
// server re-applies its own version before saving.
function slugifyTitle(title) {
  let cleaned = title.toLowerCase();
  cleaned = cleaned.normalize("NFD");
  cleaned = cleaned.replace(/[̀-ͯ]/g, "");
  cleaned = cleaned.replace(/[^a-z0-9\s-]/g, "");
  cleaned = cleaned.replace(/\s+/g, "-");
  cleaned = cleaned.replace(/-+/g, "-");
  cleaned = cleaned.replace(/^-|-$/g, "");
  return cleaned;
}

const BLOG_CLOUDINARY_URL    = "https://api.cloudinary.com/v1_1/dfxhlv8jc/image/upload";
const BLOG_CLOUDINARY_PRESET = "hidden_gems_sa_blog";

function BlogEditor({ post, existingSlugs, actions, onSaved, onCancel, onDeleted }) {
  const [title, setTitle]     = useState(post?.title ?? "");
  const [slug, setSlug]       = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [area, setArea]       = useState(post?.area ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving]   = useState(false);

  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featured_image_url ?? "");
  const [cropSrc, setCropSrc]     = useState("");
  const [cropOpen, setCropOpen]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await actions.deleteBlogPost(post.id);
    setDeleting(false);
    if (result.success) {
      onDeleted();
    } else {
      setFieldErrors((prev) => ({ ...prev, save: result.error }));
    }
  }

  const imgRef     = useRef(null);
  const cropperRef = useRef(null);
  const fileRef    = useRef(null);

  useEffect(() => {
    if (!cropOpen || !imgRef.current) return;

    let destroyed = false;

    import("cropperjs").then(({ default: Cropper }) => {
      if (destroyed || !imgRef.current) return;
      cropperRef.current = new Cropper(imgRef.current, {
        aspectRatio: 16 / 9,
        viewMode: 1,
        autoCropArea: 0.8,
        responsive: true,
      });
    });

    return () => {
      destroyed = true;
      cropperRef.current?.destroy();
      cropperRef.current = null;
    };
  }, [cropOpen]);

  function handleFeaturedImageFileChange(e) {
    const chosenFile = e.target.files?.[0];
    if (!chosenFile) return;

    setUploadError("");
    setCropSrc(URL.createObjectURL(chosenFile));
    setCropOpen(true);
    e.target.value = "";
  }

  function cancelFeaturedImageCrop() {
    setCropOpen(false);
    URL.revokeObjectURL(cropSrc);
    setCropSrc("");
  }

  async function confirmFeaturedImageCrop() {
    if (!cropperRef.current) return;
    setUploading(true);
    setUploadError("");

    cropperRef.current
      .getCroppedCanvas({ width: 1280, height: 720 })
      .toBlob(async (croppedImageBlob) => {
        try {
          const uploadData = new FormData();
          uploadData.append("file", croppedImageBlob, "featured.jpg");
          uploadData.append("upload_preset", BLOG_CLOUDINARY_PRESET);

          const uploadResponse = await fetch(BLOG_CLOUDINARY_URL, { method: "POST", body: uploadData });
          const uploadResult   = await uploadResponse.json();

          if (uploadResult.secure_url) {
            setFeaturedImageUrl(uploadResult.secure_url);
            setCropOpen(false);
            URL.revokeObjectURL(cropSrc);
            setCropSrc("");
          } else {
            setUploadError("Upload failed. Please try again.");
          }
        } catch {
          setUploadError("Upload error. Please check your connection and try again.");
        } finally {
          setUploading(false);
        }
      }, "image/jpeg", 0.9);
  }

  function handleChangeFeaturedImageClick() {
    setFeaturedImageUrl("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function handleTitleChange(e) {
    const value = e.target.value;
    setTitle(value);
    if (!slugTouched) setSlug(slugifyTitle(value));
  }

  function handleSlugChange(e) {
    setSlugTouched(true);
    setSlug(e.target.value);
  }

  function validate() {
    const errors = {};
    if (!title.trim()) errors.title = "Title is required.";
    if (!content.trim()) errors.content = "Content is required.";

    const cleanSlug = slugifyTitle(slug);
    if (!cleanSlug) {
      errors.slug = "Slug is required.";
    } else if (existingSlugs.some((existing) => existing.slug === cleanSlug && existing.id !== post?.id)) {
      errors.slug = "This slug is already used by another post.";
    }
    return errors;
  }

  async function handleSave() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const payload = {
      title,
      slug: slugifyTitle(slug),
      excerpt,
      content,
      category: category || null,
      area,
      published,
      featured_image_url: featuredImageUrl || null,
    };
    const result = post
      ? await actions.updateBlogPost(post.id, payload)
      : await actions.createBlogPost(payload);
    setSaving(false);

    if (result.success) {
      onSaved(!!post);
    } else {
      setFieldErrors((prev) => ({ ...prev, save: result.error }));
    }
  }

  return (
    <div className="adm-card adm-editor">
      <div className="adm-card-head">
        <div>
          <button type="button" className="adm-back" onClick={onCancel}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" /> All stories
          </button>
          <h2 className="adm-card-title">{post ? "Edit story" : "New story"}</h2>
          {post && (
            <p className="adm-card-sub">
              {post.published ? "Published" : "Draft"} · last updated <When value={post.updated_at} time />
            </p>
          )}
        </div>
      </div>

      <div className="adm-field">
        <label htmlFor="blog-title" className="adm-label">Title <span className="adm-req">*</span></label>
        <input id="blog-title" className="adm-input" type="text" value={title} onChange={handleTitleChange} />
        {fieldErrors.title && <span className="adm-field-error">{fieldErrors.title}</span>}
      </div>

      <div className="adm-field">
        <label htmlFor="blog-slug" className="adm-label">Slug <span className="adm-req">*</span></label>
        <div className="adm-input-prefix">
          <span>/blog/</span>
          <input id="blog-slug" className="adm-input" type="text" value={slug} onChange={handleSlugChange} />
        </div>
        {fieldErrors.slug && <span className="adm-field-error">{fieldErrors.slug}</span>}
      </div>

      <div className="adm-field">
        <label htmlFor="blog-excerpt" className="adm-label">Excerpt <span className="adm-opt">(optional)</span></label>
        <textarea id="blog-excerpt" className="adm-input" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      </div>

      <div className="adm-field">
        <label htmlFor="blog-content" className="adm-label">Content <span className="adm-req">*</span></label>
        <textarea
          id="blog-content"
          className="adm-input"
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Separate paragraphs with a blank line — they'll each render as their own paragraph."
        />
        {fieldErrors.content && <span className="adm-field-error">{fieldErrors.content}</span>}
      </div>

      <div className="adm-field-row">
        <div className="adm-field">
          <label htmlFor="blog-category" className="adm-label">Category <span className="adm-opt">(optional)</span></label>
          <select id="blog-category" className="adm-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">None</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="adm-field">
          <label htmlFor="blog-area" className="adm-label">Area <span className="adm-opt">(optional)</span></label>
          <input id="blog-area" className="adm-input" type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Ladysmith" />
        </div>
      </div>

      <div className="adm-field">
        <span className="adm-label">Featured Image <span className="adm-opt">(optional)</span></span>
        {featuredImageUrl ? (
          <div className="adm-image-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={featuredImageUrl} alt="Featured image" />
            <button type="button" className="adm-btn adm-btn--ghost" onClick={handleChangeFeaturedImageClick}>
              <i className="fa-solid fa-rotate" aria-hidden="true" /> Change Image
            </button>
          </div>
        ) : (
          <label className="adm-dropzone">
            <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
            <span className="adm-dropzone-label">Tap to upload a featured image</span>
            <span className="adm-hint">PNG, JPG or WebP. You&apos;ll crop it to a 16:9 banner before it uploads.</span>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
              onChange={handleFeaturedImageFileChange} className="adm-visually-hidden" />
          </label>
        )}
        {uploadError && <span className="adm-field-error">{uploadError}</span>}
      </div>

      <label className="adm-switch">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <span className="adm-switch-track" aria-hidden="true" />
        <span>Published <span className="adm-opt">(visible on the public site)</span></span>
      </label>

      {fieldErrors.save && (
        <div className="adm-banner adm-banner--error" role="alert">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {fieldErrors.save}
        </div>
      )}

      <div className="adm-editor-foot">
        <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="adm-btn adm-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Post"}
        </button>
      </div>

      {post && (
        <div className="adm-editor-danger">
          <DeleteConfirm
            noun="post"
            isConfirming={confirmDelete}
            deleting={deleting}
            onRequestDelete={() => setConfirmDelete(true)}
            onCancel={() => setConfirmDelete(false)}
            onConfirmDelete={handleDelete}
          />
        </div>
      )}

      {cropOpen && (
        <div className="crop-overlay adm-crop-overlay" role="dialog" aria-modal="true" aria-label="Crop your featured image">
          <div className="crop-modal">
            <div className="crop-modal-header">
              <h3>Crop Your Featured Image</h3>
              <p>Drag to reposition — scroll or pinch to zoom</p>
            </div>
            <div className="crop-img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imgRef} src={cropSrc} alt="Featured image to crop" />
            </div>
            {uploadError && <p className="adm-field-error adm-crop-error">{uploadError}</p>}
            <div className="crop-modal-footer">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={cancelFeaturedImageCrop} disabled={uploading}>
                Cancel
              </button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={confirmFeaturedImageCrop} disabled={uploading}>
                {uploading
                  ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Uploading...</>
                  : <><i className="fa-solid fa-check" aria-hidden="true" /> Confirm &amp; Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "all",       label: "All stories" },
  { id: "drafts",    label: "Drafts" },
  { id: "published", label: "Published" },
];

// the exact payload the editor would send if the post were opened and
// saved unchanged, with only "published" flipped — so no field is wiped.
function togglePublishedPayload(post) {
  return {
    title: post.title ?? "",
    slug: post.slug ?? "",
    excerpt: post.excerpt ?? "",
    content: post.content ?? "",
    category: post.category || null,
    area: post.area ?? "",
    published: !post.published,
    featured_image_url: post.featured_image_url || null,
  };
}

function StoryCard({ post, onEdit, actions, notify, refresh }) {
  const [working, setWorking]   = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function toggle() {
    setWorking(true);
    setFeedback(null);
    const result = await actions.updateBlogPost(post.id, togglePublishedPayload(post));
    setWorking(false);
    if (result.success) {
      const text = post.published ? `"${post.title}" moved to drafts.` : `"${post.title}" is now published.`;
      setFeedback({ text });
      notify(text);
      refresh();
    } else {
      setFeedback({ text: result.error ?? "That didn't work. Please try again.", error: true });
    }
  }

  return (
    <article className="adm-story">
      <div className="adm-story-top">
        <span className={`adm-pill ${post.published ? "adm-pill--approved" : "adm-pill--draft"}`}>
          {post.published ? "Published" : "Draft"}
        </span>
        <span className="adm-muted">Updated <When value={post.updated_at} /></span>
      </div>
      <h3 className="adm-story-title">{post.title}</h3>
      <p className="adm-story-excerpt">{post.excerpt || (post.content ?? "").slice(0, 140) || "No excerpt yet."}</p>
      <p className="adm-story-slug">/blog/{post.slug}</p>
      <InlineFeedback feedback={feedback} />
      <div className="adm-btn-row adm-story-actions">
        <button type="button" className="adm-btn adm-btn--review" onClick={onEdit}>
          <i className="fa-solid fa-pen" aria-hidden="true" /> Edit story
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={toggle} disabled={working}>
          {working ? "Saving..." : post.published ? "Move to draft" : "Publish"}
        </button>
      </div>
    </article>
  );
}

export default function BlogView({ blogPosts, tab, onTabChange, story, onOpenStory, onCloseStory, actions, notify, refresh }) {
  const editingPost = story && story !== "new" ? blogPosts.find((p) => String(p.id) === String(story)) ?? null : null;
  const editorOpen = story === "new" || !!editingPost;

  if (editorOpen) {
    return (
      <BlogEditor
        key={editingPost?.id ?? "new"}
        post={editingPost}
        actions={actions}
        existingSlugs={blogPosts.map((p) => ({ id: p.id, slug: p.slug }))}
        onCancel={onCloseStory}
        onSaved={(wasEditing) => {
          onCloseStory();
          notify(wasEditing ? "Post updated." : "Post created.");
          refresh();
        }}
        onDeleted={() => {
          onCloseStory();
          notify("Post deleted.");
          refresh();
        }}
      />
    );
  }

  const counts = {
    all: blogPosts.length,
    drafts: blogPosts.filter((p) => !p.published).length,
    published: blogPosts.filter((p) => p.published).length,
  };
  const shown = blogPosts.filter((p) => tab === "all" || (tab === "drafts" ? !p.published : p.published));

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <div>
          <h2 className="adm-card-title">Stories</h2>
          <p className="adm-card-sub">Most recently updated first.</p>
        </div>
        <button type="button" className="adm-btn adm-btn--review" onClick={() => onOpenStory("new")}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> New story
        </button>
      </div>

      <div className="adm-filters adm-filters--wrap" role="tablist" aria-label="Filter stories">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`adm-filter ${tab === id ? "is-active" : ""}`}
            onClick={() => onTabChange(id)}
          >
            {label}
            <span className="adm-filter-count">{counts[id]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="fa-feather" title={tab === "drafts" ? "No drafts." : tab === "published" ? "Nothing published yet." : "No stories yet."}>
          Start one with New story.
        </EmptyState>
      ) : (
        <div className="adm-story-grid">
          {shown.map((post) => (
            <StoryCard key={post.id} post={post} onEdit={() => onOpenStory(post.id)} actions={actions} notify={notify} refresh={refresh} />
          ))}
        </div>
      )}
    </section>
  );
}
