type CodeControl = {
  isVisible(): Promise<boolean>;
  click(): Promise<void>;
  waitFor(options: {state: 'visible'}): Promise<void>;
  inputValue(): Promise<string>;
};
type CodePage = {
  getByRole(role: 'textbox' | 'button', options: {name: string; exact: true}): CodeControl;
};
/** Follow the Owner's explicit disclosure before reading the one-use code. */
export function showClockerSetupCode(page: CodePage): Promise<CodeControl>;
