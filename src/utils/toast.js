// Minimal DOM toast helper for quick feedback without adding dependencies
const containerId = 'fv-toast-container'
function ensureContainer() {
  let c = document.getElementById(containerId)
  if (!c) {
    c = document.createElement('div')
    c.id = containerId
    c.style.position = 'fixed'
    c.style.right = '20px'
    c.style.top = '20px'
    c.style.zIndex = '9999'
    c.style.display = 'flex'
    c.style.flexDirection = 'column'
    c.style.gap = '8px'
    document.body.appendChild(c)
  }
  return c
}

export function showToast(message, type = 'info', timeout = 5000) {
  try {
    const c = ensureContainer()
    const el = document.createElement('div')
    el.textContent = message
    el.style.minWidth = '200px'
    el.style.maxWidth = '360px'
    el.style.padding = '10px 14px'
    el.style.borderRadius = '8px'
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)'
    el.style.color = '#fff'
    el.style.fontSize = '14px'
    el.style.opacity = '0'
    el.style.transform = 'translateY(-6px)'
    el.style.transition = 'opacity 200ms ease, transform 200ms ease'

    if (type === 'error') {
      el.style.background = '#dc2626'
    } else if (type === 'success') {
      el.style.background = '#16a34a'
    } else if (type === 'warn' || type === 'warning') {
      el.style.background = '#d97706'
    } else {
      el.style.background = '#111827'
    }

    c.appendChild(el)
    // animate in
    requestAnimationFrame(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })

    const tid = setTimeout(() => {
      // animate out
      el.style.opacity = '0'
      el.style.transform = 'translateY(-6px)'
      setTimeout(() => { try { c.removeChild(el) } catch (e) {} }, 220)
    }, timeout)

    // allow clicking to dismiss early
    el.addEventListener('click', () => {
      clearTimeout(tid)
      el.style.opacity = '0'
      el.style.transform = 'translateY(-6px)'
      setTimeout(() => { try { c.removeChild(el) } catch (e) {} }, 220)
    })
  } catch (e) {
    console.error('showToast error', e)
  }
}

export default { showToast }
