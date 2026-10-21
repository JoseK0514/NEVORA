import Link from "next/link";
import { Card, CardBody, KitStack, PageBand } from "@/components/kit/kit";

/** Review fix (39/50): an unknown /app URL showed Next's bare 404 with no shell styling and no way back. */
export default function NotFound() {
  return (
    <div className="nv-page premium-error" data-nv-page="">
      <PageBand title="There’s no page here" summary="The link may be old, or the page may have moved." />
      <KitStack>
        <Card>
          <CardBody>
            <div className="premium-error__body">
              <p className="premium-error__text">Check the address, or head back to Home.</p>
              <div className="premium-error__actions">
                <Link className="nv-btn" data-kind="primary" href="/app">Back to Home</Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </KitStack>
    </div>
  );
}
