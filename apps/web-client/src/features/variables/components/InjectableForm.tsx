import { useTranslation } from 'react-i18next'

interface InjectableFormProps {
  keyValue: string
  onKeyChange: (value: string) => void
  label: string
  onLabelChange: (value: string) => void
  defaultValue: string
  onDefaultValueChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  showKeyHint?: boolean
  idPrefix: string
}

export function InjectableForm({
  keyValue,
  onKeyChange,
  label,
  onLabelChange,
  defaultValue,
  onDefaultValueChange,
  description,
  onDescriptionChange,
  showKeyHint = true,
  idPrefix,
}: InjectableFormProps): React.ReactElement {
  const { t } = useTranslation()

  const inputClassName =
    'w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0'
  const labelClassName =
    'mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground'

  const counterClassName = 'mt-1 text-right text-[10px] font-mono text-muted-foreground/60'

  return (
    <div className="space-y-6 p-6">
      <div>
        <label htmlFor={`${idPrefix}-label`} className={labelClassName}>
          {t('variables.label', 'Display Label')}
        </label>
        <input
          id={`${idPrefix}-label`}
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder={t('variables.labelPlaceholder', 'e.g., Company Name')}
          maxLength={255}
          autoFocus
          className={inputClassName}
        />
        <div className={counterClassName}>{label.length}/255</div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-key`} className={labelClassName}>
          {t('variables.key', 'Variable Key')}
        </label>
        <input
          id={`${idPrefix}-key`}
          type="text"
          value={keyValue}
          onChange={(e) =>
            onKeyChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
          }
          placeholder={t('variables.keyPlaceholder', 'e.g., company_name')}
          maxLength={100}
          className={`${inputClassName} font-mono text-sm`}
        />
        <div className="flex items-center justify-between mt-1">
          {showKeyHint ? (
            <p className="text-xs text-muted-foreground/70">
              {t(
                'variables.keyHint',
                'Use snake_case format (letters, numbers, underscores)'
              )}
            </p>
          ) : (
            <span />
          )}
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {keyValue.length}/100
          </span>
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-defaultValue`} className={labelClassName}>
          {t('variables.defaultValue', 'Default Value')}
        </label>
        <input
          id={`${idPrefix}-defaultValue`}
          type="text"
          value={defaultValue}
          onChange={(e) => onDefaultValueChange(e.target.value)}
          placeholder={t(
            'variables.defaultValuePlaceholder',
            'e.g., Acme Corporation'
          )}
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-description`} className={labelClassName}>
          {t('variables.description', 'Description')}
          <span className="ml-1 normal-case text-muted-foreground/50">
            ({t('common.optional', 'optional')})
          </span>
        </label>
        <input
          id={`${idPrefix}-description`}
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t(
            'variables.descriptionPlaceholder',
            'Brief description of the variable'
          )}
          maxLength={500}
          className={inputClassName}
        />
        <div className={counterClassName}>{description.length}/500</div>
      </div>
    </div>
  )
}
