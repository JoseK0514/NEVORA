import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading eyebrow add="Add location" title={<span className="wc-skeleton__title" />} summary="Where your team works, each place’s scheduling setup and its Clocker link." label="locations" cards={[2, 3, 3]} aside={false} />;
}
