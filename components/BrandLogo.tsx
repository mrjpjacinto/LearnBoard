export default function BrandLogo({compact=false,className=""}:{compact?:boolean;className?:string}) {
  return <svg role="img" aria-label="LumenTrail" viewBox={compact ? "95 225 410 410" : "95 225 1540 410"} className={className}><image href="/lumentrail-logo.png" width="1774" height="887" /></svg>;
}
