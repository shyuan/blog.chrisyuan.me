import type { Props } from "astro";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconLinkedin from "@/assets/icons/IconLinkedin.svg";
import IconFacebook from "@/assets/icons/IconFacebook.svg";
import IconLine from "@/assets/icons/IconLine.svg";
import IconThreads from "@/assets/icons/IconThreads.svg";
import IconBluesky from "@/assets/icons/IconBluesky.svg";
import IconTelegram from "@/assets/icons/IconTelegram.svg";
import IconCopy from "@/assets/icons/IconCopy.svg";
import { SITE } from "@/config";

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
}

export const SOCIALS: Social[] = [
  {
    name: "GitHub",
    href: "https://github.com/shyuan/blog.chrisyuan.me",
    linkTitle: `${SITE.title} on GitHub`,
    icon: IconGitHub,
  },
  {
    name: "X",
    href: "https://x.com/honglong0420",
    linkTitle: `${SITE.title} on X`,
    icon: IconBrandX,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/shyuan/",
    linkTitle: `${SITE.title} on LinkedIn`,
    icon: IconLinkedin,
  },
  {
    name: "Mail",
    href: "mailto:chris.yuan@0x0.tw",
    linkTitle: `Send an email to ${SITE.title}`,
    icon: IconMail,
  },
] as const;

/**
 * Share targets shown at the bottom of each post.
 *
 * Each entry is either a regular share URL (the current page URL is
 * appended to `href`) or a `copy: true` entry that copies the page
 * URL to the clipboard via the Web Clipboard API.
 */
export type ShareLink =
  | {
      name: string;
      linkTitle: string;
      icon: (_props: Props) => Element;
      href: string;
      copy?: false;
    }
  | {
      name: string;
      linkTitle: string;
      icon: (_props: Props) => Element;
      copy: true;
    };

export const SHARE_LINKS: ShareLink[] = [
  {
    name: "LINE",
    href: "https://social-plugins.line.me/lineit/share?url=",
    linkTitle: `Share this post via LINE`,
    icon: IconLine,
  },
  {
    name: "Threads",
    href: "https://www.threads.net/intent/post?text=",
    linkTitle: `Share this post on Threads`,
    icon: IconThreads,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/sharer.php?u=",
    linkTitle: `Share this post on Facebook`,
    icon: IconFacebook,
  },
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: `Share this post on X`,
    icon: IconBrandX,
  },
  {
    name: "Bluesky",
    href: "https://bsky.app/intent/compose?text=",
    linkTitle: `Share this post on Bluesky`,
    icon: IconBluesky,
  },
  {
    name: "Telegram",
    href: "https://t.me/share/url?url=",
    linkTitle: `Share this post on Telegram`,
    icon: IconTelegram,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/sharing/share-offsite/?url=",
    linkTitle: `Share this post on LinkedIn`,
    icon: IconLinkedin,
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: `Share this post via email`,
    icon: IconMail,
  },
  {
    name: "Copy",
    copy: true,
    linkTitle: `Copy link to this post`,
    icon: IconCopy,
  },
] as const;
