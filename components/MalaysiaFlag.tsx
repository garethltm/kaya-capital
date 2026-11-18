type MalaysiaFlagProps = {
  className?: string;
};

const starPoints = Array.from({ length: 28 }, (_, index) => {
  const radius = index % 2 === 0 ? 22 : 19;
  const angle = (index * Math.PI) / 14 - Math.PI / 2;
  return `${116 + radius * Math.cos(angle)},${40 + radius * Math.sin(angle)}`;
}).join(' ');

export default function MalaysiaFlag({ className }: MalaysiaFlagProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 140"
      role="img"
      aria-label="Flag of Malaysia"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: 14 }, (_, index) => (
        <rect
          key={index}
          x="0"
          y={index * 10}
          width="280"
          height="10"
          fill={index % 2 === 0 ? '#CC0001' : '#FFFFFF'}
        />
      ))}
      <rect x="0" y="0" width="160" height="80" fill="#010066" />
      <circle cx="64" cy="40" r="25" fill="#FFCC00" />
      <circle cx="76" cy="35" r="23" fill="#010066" />
      <polygon points={starPoints} fill="#FFCC00" />
    </svg>
  );
}
