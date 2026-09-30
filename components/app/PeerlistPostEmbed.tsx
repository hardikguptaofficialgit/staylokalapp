"use client";

import { useEffect } from "react";

const PEERLIST_POST_EMBED_URL =
  "https://peerlist.io/embeds/posts?postId=ACTHJKNLOMG9DA9EEIR7M7AABPDJG8";

export default function PeerlistPostEmbed() {
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://peerlist.io") return;
      if (event.data?.type !== "setHeight") return;
      const iframe = document.getElementById("peerlist-post");
      if (iframe instanceof HTMLIFrameElement && typeof event.data.height === "number") {
        iframe.style.height = `${event.data.height}px`;
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <section className="landing-peerlist-embed" aria-label="Peerlist post">
      <iframe
        id="peerlist-post"
        className="landing-peerlist-iframe"
        src={PEERLIST_POST_EMBED_URL}
        title="StayLokal update on Peerlist"
        loading="lazy"
        allowFullScreen
      />
    </section>
  );
}
