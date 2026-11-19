export function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" fill="currentColor">
      <path d="M16.04 3C9.4 3 4 8.36 4 14.98c0 2.3.66 4.54 1.9 6.47L4 29l7.76-2.03a12.1 12.1 0 0 0 4.28.78C22.68 27.75 28 22.4 28 15.78 28 9.15 22.68 3 16.04 3Zm0 22.6c-1.38 0-2.73-.28-3.99-.82l-.29-.12-4.6 1.2 1.23-4.48-.19-.3a9.86 9.86 0 0 1-1.52-5.1c0-5.46 4.44-9.9 9.9-9.9 5.42 0 9.84 4.56 9.84 10.02 0 5.47-4.4 9.5-10.38 9.5Zm5.43-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48a9 9 0 0 1-1.66-2.07c-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function WhatsAppFab({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile yazın"
      className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.35)] transition hover:scale-105 sm:bottom-7 sm:right-7"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-20 [animation-duration:2.6s]" />
      <WhatsAppIcon size={28} />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-charcoal px-3 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 sm:block">
        WhatsApp ile yazın
      </span>
    </a>
  );
}
