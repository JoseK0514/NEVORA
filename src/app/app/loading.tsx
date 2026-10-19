import { RootLoading } from "./root-loading";

/** Home's placeholder matches every other tab's: the band at its final height, then cards (ST-05).
 * During a tab change it takes the destination's shape instead (ST-22). */
export default function Loading() {
  return <RootLoading />;
}
