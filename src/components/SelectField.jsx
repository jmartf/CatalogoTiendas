export default function SelectField({ label, value, onChange, options, placeholder = 'Seleccionar', required = false, disabled = false, allowEmpty = true, hint = '' }) {
  return (
    <label className="form-field">
      <span>{label}{required && <em aria-hidden="true"> *</em>}</span>
      <select value={value} onChange={onChange} required={required} disabled={disabled}>
        {allowEmpty && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}{option.active ? '' : ' (inactivo)'}</option>)}
      </select>
      {hint && <small>{hint}</small>}
    </label>
  )
}
