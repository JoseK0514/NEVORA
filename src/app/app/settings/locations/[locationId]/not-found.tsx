import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { BState, BStateScreen } from "@/components/owner-b/b-kit";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../../settings-copy";

/** WR-05: an unknown or removed location keeps the Settings frame and a way back. Phase 2 (package D): the one Direction B
 * state screen (it was the Settings kit's empty block); the words and the action are unchanged. */
export default async function LocationNotFound() {
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const words = wordPreset((await currentPresentation()).words)[lang];
  const place = lower(words.location);
  return (
    <div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="" lang={lang === "es" ? "es" : undefined}>
      <BStateScreen title={t.placeNotFound(words.location)} sub={t.placeNotFoundSub} back={{ href: "/app/settings/locations", label: words.locations }}>
        <BState silent kind="failed" title={t.couldntFindPlace(place)} line={t.openAgainFrom(words.locations)}
          action={{ label: t.goTo(words.locations), href: "/app/settings/locations" }} />
      </BStateScreen>
    </div>
  );
}
