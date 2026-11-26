import "./assignment-address.css";

/** The authorized shift supplies its own address, including line breaks entered by the owner. */
export function AssignmentAddress({ address }: { address?: string | null }) {
  return address ? <span className="assignment-address">{address}</span> : null;
}
