import { useRef } from 'react'
import { Member } from '../types'
import { Barcode } from './Barcode'
import { Button, Modal } from './UI'

interface MemberCredentialProps {
  member: Member | null
  gymName: string
  onClose: () => void
}

// Imprime solo la credencial usando un iframe oculto, para no imprimir toda la ventana
function printCredential(credential: HTMLElement) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const printWindow = iframe.contentWindow
  const printDocument = iframe.contentDocument
  if (!printWindow || !printDocument) {
    iframe.remove()
    return
  }

  const style = printDocument.createElement('style')
  style.textContent = `
    @page { margin: 10mm; }
    body { margin: 0; font-family: system-ui, sans-serif; color: #000; }
    .credential { display: inline-block; border: 1px solid #000; border-radius: 8px; padding: 16px 20px; text-align: center; }
    .gym { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .name { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .code { font-family: monospace; font-size: 16px; letter-spacing: 2px; margin-top: 4px; }
  `
  printDocument.head.appendChild(style)
  printDocument.body.appendChild(printDocument.importNode(credential, true))

  printWindow.addEventListener('afterprint', () => iframe.remove())
  printWindow.focus()
  printWindow.print()
}

export function MemberCredential({ member, gymName, onClose }: MemberCredentialProps) {
  const credentialRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (credentialRef.current) printCredential(credentialRef.current)
  }

  return (
    <Modal open={member !== null} onClose={onClose} title="Credencial del Miembro">
      {member && (
        <>
          <div className="flex justify-center">
            <div ref={credentialRef} className="credential inline-block border border-gray-300 rounded-lg px-5 py-4 text-center bg-white">
              <div className="gym text-sm font-semibold text-gray-600 mb-1">{gymName}</div>
              <div className="name text-lg font-bold text-gray-900 mb-2">{member.name}</div>
              <Barcode value={member.code} />
              <div className="code font-mono text-base tracking-widest mt-1">{member.code}</div>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center mt-4">
            El miembro puede escanear esta credencial o escribir su código en el Check-In.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            <Button onClick={handlePrint}>Imprimir</Button>
          </div>
        </>
      )}
    </Modal>
  )
}
