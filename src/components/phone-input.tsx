export default function PhoneInput() {
  return (
    <div>
      <label htmlFor="phone" className="label">Mobile number</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        required
        className="input"
      />
      <p className="mt-1 text-xs text-muted">Indian numbers need no prefix; others start with +country code.</p>
    </div>
  );
}
