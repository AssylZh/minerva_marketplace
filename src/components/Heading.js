export default function Heading({level, children}) {
    const Tag = `h${level || 2}`;
    return <Tag>{children}</Tag>;
}
