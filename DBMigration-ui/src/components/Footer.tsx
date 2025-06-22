function Footer() {
    return (
      <footer className="bg-gray-100 text-sm text-gray-700 py-6 mt-10 border-t">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 px-4">
          <div>
            <h4 className="font-semibold mb-2">About Us</h4>
            <p>
              This tool assists in automating the Teradata to DB2 migration using IBM AI standards and best practices.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Contact Us</h4>
            <p>Email: support@ibmmigration.com</p>
            <p>Phone: +1 800-123-4567</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">FAQ</h4>
            <ul className="list-disc list-inside">
              <li>How to upload scripts?</li>
              <li>What DB versions are supported?</li>
              <li>Where can I check logs?</li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">© 2025 IBM Migration Tool</p>
      </footer>
    );
  }
  
  export default Footer;
  