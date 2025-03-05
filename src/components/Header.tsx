import Link from "next/link";

const Header = () => {
  return (
    <header className="header">
      <div className="logo">
        <Link href="/">QuickTranslate</Link>
      </div>

    </header>
  );
};

export default Header;
