export const id = {
  app: { name: 'Buku', tagline: 'Akuntansi Indonesia' },
  common: {
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    create: 'Buat',
    edit: 'Ubah',
    loading: 'Memuat…',
    noData: 'Tidak ada data',
    error: 'Terjadi kesalahan',
    reference: 'Referensi',
    search: 'Cari',
    actions: 'Aksi',
  },
  auth: {
    signIn: 'Masuk',
    signOut: 'Keluar',
    email: 'Email',
    password: 'Kata sandi',
    loginTitle: 'Masuk ke Buku',
    invalidCredentials: 'Email atau kata sandi salah',
  },
  nav: {
    dashboard: 'Dasbor',
    accounts: 'Bagan Akun',
    partners: 'Mitra Bisnis',
    taxCodes: 'Kode Pajak',
    salesInvoices: 'Faktur Penjualan',
    payments: 'Pembayaran',
  },
  roles: {
    forbidden: 'Anda tidak memiliki izin untuk tindakan ini',
    segregationOfDuties:
      'Pembuat dokumen tidak boleh menyetujui sendiri. Serahkan ke approver lain.',
  },
} as const;

export type Messages = typeof id;
