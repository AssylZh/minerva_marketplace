/** Reusable button component that maps a variant name to a CSS class. */
export default function Button({ children, variant, onClick, type = "button", ...props }) {
    return (
        <button type={type} className={variant} onClick={onClick} {...props}>{children}</button>
    )
}
