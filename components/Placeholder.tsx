import styles from "./Placeholder.module.css";

interface PlaceholderProps {
  title: string;
  description: string;
  planned: string[];
}

export default function Placeholder({
  title,
  description,
  planned,
}: PlaceholderProps) {
  return (
    <div className={styles.placeholder}>
      <div className={styles.icon}>GHN</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.desc}>{description}</p>
      <div className={styles.badge}>Chưa triển khai</div>
      <ul className={styles.items} style={{ marginTop: 20 }}>
        {planned.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
