// The browser-tab icon, built at deploy time from next/og: no image file to keep in step with the palette.
import { ImageResponse } from "next/og";
import RedCardIcon from "@/components/red-card-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<RedCardIcon scale={1} />, size);
}
