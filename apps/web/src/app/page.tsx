import { FogataScene } from "@/components/scene/FogataScene";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/server";

export default async function Home() {
  const { meta } = DICTIONARIES[await getLocale()];
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-night">
      <h1 className="sr-only">{meta.title}</h1>
      <FogataScene />
    </main>
  );
}
