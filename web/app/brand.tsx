import Image from "next/image";

const marks = {
  mark: {
    light: "/north-arrow-logo/svg/icon-mark-light.svg",
    dark: "/north-arrow-logo/svg/icon-mark-dark.svg",
  },
  lockup: {
    light: "/north-arrow-logo/svg/logo-light.svg",
    dark: "/north-arrow-logo/svg/logo-dark.svg",
  },
} as const;

export function Brand({
  kind = "mark",
  size = 32,
  href = "/",
  className = "brand",
  priority = false,
}: {
  kind?: keyof typeof marks;
  size?: number;
  href?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const pair = marks[kind];
  const images = (
    <>
      <Image
        className="when-light"
        src={pair.light}
        alt="North Arrow"
        width={size}
        height={size}
        unoptimized
        priority={priority}
      />
      <Image
        className="when-dark"
        src={pair.dark}
        alt=""
        width={size}
        height={size}
        unoptimized
        priority={priority}
      />
    </>
  );

  if (!href) {
    return (
      <span className={className} style={{ width: size, height: size }}>
        {images}
      </span>
    );
  }

  return (
    <a className={className} href={href} aria-label="North Arrow home" style={{ width: size, height: size }}>
      {images}
    </a>
  );
}
