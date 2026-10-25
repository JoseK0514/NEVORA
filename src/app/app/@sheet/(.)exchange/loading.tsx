/** While the shift change loads: the sheet's bar and rows, static. */
export default function ShiftChangeSheetLoading() {
  return <div className="q-sheet-skel" aria-busy="true" aria-label="Loading">
    <div className="q-nav"><span /><span className="q-nav__t" /><span /></div>
    <div className="q-sheet-skel__rows"><i /><i /><i /><i /></div>
  </div>;
}
