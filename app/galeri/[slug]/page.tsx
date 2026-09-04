import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Footer, Header } from "@/components/PublicChrome";
import { getGalleryMedia } from "@/lib/cms";
import { getGalleryEventBySlugServer } from "@/lib/server/local-cms-store";
import { whatsappUrl } from "@/lib/data";

type PageProps = { params: Promise<{ slug: string }> };

export default async function GalleryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getGalleryEventBySlugServer(slug);
  if (!event) notFound();
  const media = await getGalleryMedia(event.id);

  return (
    <main className="site-shell">
      <Header active="/tentang-kami" />
      <section className="page-hero container"><span className="tag">Dokumentasi Kegiatan</span><h1>{event.title}</h1><p>{event.description}</p></section>
      <section className="container service-list">
        {event.cover_image_url && <div className="article-cover"><img src={event.cover_image_url} alt={event.title} /></div>}
        {event.source_url && <a className="btn btn-soft" href={event.source_url}>Lihat sumber kegiatan<ArrowRight size={15} /></a>}
        <div className="section-head"><h2>Dokumentasi Media</h2></div>
        {media.length === 0 ? <article className="card">Media kegiatan sedang disiapkan.</article> : <div className="services-grid">{media.map((item) => <article className="card" key={item.id}>{item.media_type === "image" ? <img src={item.media_url} alt={item.caption || "Dokumentasi QONSULIN.ID"} /> : <a className="btn btn-primary" href={item.media_url}>Lihat Video</a>}{item.caption && <p>{item.caption}</p>}</article>)}</div>}
        <article className="card"><h2>Ingin mengikuti info kegiatan berikutnya?</h2><p>Hubungi admin untuk bertanya tentang edukasi, webinar, atau ruang cerita yang sedang dibuka.</p><a className="btn btn-primary" href={whatsappUrl}>Hubungi Admin QONSULIN.ID</a></article>
      </section>
      <Footer />
    </main>
  );
}
