// The home-screen icon on iPhones: the same red card as the tab icon, drawn at 180px.
import { ImageResponse } from "next/og";
import RedCardIcon from "@/components/red-card-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<RedCardIcon scale={5.6} />, size);
}
