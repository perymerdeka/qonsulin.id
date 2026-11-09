"use client";

type Props = {
  page: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
};

export function AdminPagination({ page, totalItems, pageSize, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <nav className="admin-pagination" aria-label="Navigasi halaman data">
      <span>Menampilkan {start}-{end} dari {totalItems} data</span>
      <div>
        <button type="button" className="btn btn-white" disabled={page === 1} onClick={() => onChange(page - 1)}>Sebelumnya</button>
        <strong>Halaman {page} / {totalPages}</strong>
        <button type="button" className="btn btn-white" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Berikutnya</button>
      </div>
    </nav>
  );
}
