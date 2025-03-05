const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <p>© {currentYear} QuickTranslate. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
