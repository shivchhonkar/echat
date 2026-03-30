export default function Header() {
  return (
    <header className="billint-nav">
      <div className="billint-brand"><a href="/">BillinteChat</a></div>
      <nav>
        <a href="/">Home</a>
        <a href="/signup">Signup echat for free</a>
        <a href="/admin">Admin Panel</a>
        <a href="/super-admin">Platform Admin</a>
      </nav>
      <a className="billint-btn-primary" href="/signup">Signup for free</a>
    </header>
  );
}
