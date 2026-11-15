import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { BState, BStateScreen } from "@/components/owner-b/b-kit";

/** WR-05: an unknown or removed location keeps the Settings frame and a way back. Phase 2 (package D): the one Direction B
 * state screen (it was the Settings kit's empty block); the words and the action are unchanged. */
export default async function LocationNotFound() {
  const words = wordPreset((await currentPresentation()).words).en;
  const place = lower(words.location);
  return (
    <div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
      <BStateScreen title={`${words.location} not found`} sub="It may have been removed, or the link is out of date." back={{ href: "/app/settings/locations", label: words.locations }}>
        <BState silent kind="failed" title={`We couldn’t find this ${place}`} line={`Open it again from your list of ${lower(words.locations)}.`}
          action={{ label: `Go to ${words.locations}`, href: "/app/settings/locations" }} />
      </BStateScreen>
    </div>
  );
}
