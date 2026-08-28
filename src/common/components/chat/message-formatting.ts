export const processMessageForDisplay = (message: string): string => message
    // quick sanitization
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    // bold texts wrapped **like this**
    .replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replaceAll(/\n/g, '<br>');
