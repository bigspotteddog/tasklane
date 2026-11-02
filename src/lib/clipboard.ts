export const copyText = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
            return true
        }
    }
    catch {
        // Some embedded views block the clipboard API. Fall back below.
    }

    try {
        const field = document.createElement('textarea')

        field.value = text
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.top = '0'
        field.style.opacity = '0'

        document.body.appendChild(field)
        field.select()

        const copied = document.execCommand('copy')

        document.body.removeChild(field)

        return copied
    }
    catch {
        return false
    }
}
