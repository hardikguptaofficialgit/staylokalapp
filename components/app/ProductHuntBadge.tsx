const PRODUCT_HUNT_URL =
  "https://www.producthunt.com/products/staylokal?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-staylokal";
const POST_ID = "1265400";

function badgeSrc(theme: "dark" | "light") {
  return `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${POST_ID}&theme=${theme}&t=1790854926703`;
}

export default function ProductHuntBadge() {
  return (
    <a
      className="landing-ph-badge"
      href={PRODUCT_HUNT_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      <img
        alt="StayLokal — Private file tools that run on your device. | Product Hunt"
        className="landing-ph-badge-img landing-ph-badge-img--dark"
        height={54}
        src={badgeSrc("dark")}
        width={250}
      />
      <img
        alt=""
        aria-hidden="true"
        className="landing-ph-badge-img landing-ph-badge-img--light"
        height={54}
        src={badgeSrc("light")}
        width={250}
      />
    </a>
  );
}
