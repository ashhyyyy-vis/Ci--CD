export default function FooterBar() {
  return (
    <footer className="w-full h-12 bg-gray-200 text-center flex items-center justify-center text-gray-600 text-sm">
      © {new Date().getFullYear()} Institute Attendance System
    </footer>
  );
}
