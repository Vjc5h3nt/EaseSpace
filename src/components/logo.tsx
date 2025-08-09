import * as React from "react"

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22a10 10 0 0 0 10-10H2a10 10 0 0 0 10 10z" />
      <path d="M12 2a10 10 0 0 1 10 10" />
      <path d="M12 2a10 10 0 0 0-10 10" />
      <path d="M12 12v10" />
      <path d="M17 12a5 5 0 1 0-10 0" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function SeatwiseLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24"
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <rect height="18" rx="2" ry="2" width="18" x="3" y="3"></rect>
      <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
      <path d="M8 12h8"></path>
      <path d="M8 16h8"></path>
      <path d="m8 8-4 4 4 4"></path>
    </svg>
  );
}
