// Admin is always light, regardless of the public site's dark-mode toggle.
// Two layers keep it light:
//  1) The inline script strips `.dark` from <html> on admin routes, so the
//     shared body/Footer (rendered by the root layout, outside this subtree)
//     also render light. Admin has no client-nav link to the public site, so
//     this never desyncs the public toggle.
//  2) `force-light` re-declares the light palette tokens as a no-flash fallback
//     for the admin content itself.
const STRIP_DARK = `try{document.documentElement.classList.remove('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#F0EEE9');}catch(e){}`;

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="force-light min-h-screen bg-canvas text-ink">
      <script dangerouslySetInnerHTML={{ __html: STRIP_DARK }} />
      {children}
    </div>
  );
}
