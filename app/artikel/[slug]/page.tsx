import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Footer, Header } from "@/components/PublicChrome";
import { plainExcerpt } from "@/lib/cms";
import { getPostBySlugServer } from "@/lib/server/local-cms-store";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlugServer(slug);
  if (!post) notFound();

  return (
    <main className="site-shell">
      <Header active="/artikel" />
      <article className="container article-detail">
        {post.status === "draft" && (
          <div style={{ background: "oklch(96% 0.08 85)", color: "oklch(40% 0.15 85)", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid oklch(88% 0.1 85)", fontWeight: 500 }}>
            ⚠️ <strong>Mode Pratinjau Draf:</strong> Artikel ini saat ini berstatus <strong>Draft</strong>. Untuk menayangkannya secara publik di halaman indeks artikel, ubah statusnya menjadi <strong>Published</strong> di Admin Dashboard.
          </div>
        )}
        <span className="tag">{post.category}</span>
        <h1>{post.title}</h1>
        <p className="lead">{post.excerpt || plainExcerpt(post.content)}</p>
        {post.cover_image_url && <div className="article-cover"><img src={post.cover_image_url} alt={post.title} /></div>}
        <MarkdownContent content={post.content || post.excerpt || ""} />
      </article>
      <Footer />
    </main>
  );
}
