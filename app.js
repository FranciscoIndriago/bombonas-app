/* ============================================================
   APP DE CONTROL DE BOMBONAS - v2.0
   JWT + Dark Mode + Chart.js + PDF
   ============================================================ */

const API_URL = window.location.origin + '/api';
const TOKEN_KEY = 'bombonas_token';

// Colores para las escaleras (torta y PDF)
const COLORES_ESCALERAS = {
  '1Baja':  '#3b82f6', // Azul
  '1Media': '#10b981', // Verde
  '1Alta':  '#f59e0b', // Amarillo
  '2':      '#ef4444', // Rojo
  '3':      '#8b5cf6', // Morado
  '4':      '#ec4899'  // Rosa
};

const LABELS_ESCALERAS = {
  '1Baja': '1 Baja', '1Media': '1 Media', '1Alta': '1 Alta',
  '2': '2', '3': '3', '4': '4'
};

let chartTorta = null; // Instancia del gráfico

// ---------- Headers con JWT ----------
function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// ---------- MODO OSCURO ----------
const toggleTema = document.getElementById('toggleTema');

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('tema', tema);
  toggleTema.checked = (tema === 'dark');
  // Recolorar gráfico si existe
  if (chartTorta) actualizarColoresChart();
}

function actualizarColoresChart() {
  if (!chartTorta) return;
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--text-color').trim();
  chartTorta.options.plugins.legend.labels.color = textColor;
  chartTorta.update();
}

toggleTema.addEventListener('change', () => {
  aplicarTema(toggleTema.checked ? 'dark' : 'light');
});

// Cargar tema guardado
const temaGuardado = localStorage.getItem('tema') || 'light';
aplicarTema(temaGuardado);

// ---------- Navegación ----------
document.getElementById("tabUser").addEventListener("click", () => mostrarSeccion("user"));
document.getElementById("tabAdmin").addEventListener("click", () => mostrarSeccion("admin"));

function mostrarSeccion(seccion) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

  if (seccion === "user") {
    document.getElementById("userSection").classList.add("active");
    document.getElementById("tabUser").classList.add("active");
    document.getElementById("subtitle").textContent = "Registra tu pedido";
  } else {
    document.getElementById("adminSection").classList.add("active");
    document.getElementById("tabAdmin").classList.add("active");
    document.getElementById("subtitle").textContent = "Panel de administración";
    verificarSesion();
  }
}

// ---------- Formulario de usuario ----------
document.getElementById("formPedido").addEventListener("submit", async (e) => {
  e.preventDefault();

  const datos = {
    nombres: document.getElementById("nombres").value.trim(),
    apellidos: document.getElementById("apellidos").value.trim(),
    cantidad: parseInt(document.getElementById("cantidad").value),
    escalera: document.getElementById("escalera").value,
    celular: document.getElementById("celular").value.trim()
  };

  try {
    const res = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (res.ok) {
      mostrarMensaje("Pedido registrado correctamente", "exito");
      e.target.reset();
    } else {
      const err = await res.json();
      mostrarMensaje(" " + (err.error || "Error al guardar"), "error");
    }
  } catch (error) {
    mostrarMensaje("Error de conexión con el servidor", "error");
  }
});

function mostrarMensaje(texto, tipo) {
  const m = document.getElementById("mensaje");
  m.textContent = texto;
  m.className = "mensaje " + tipo;
  setTimeout(() => { m.className = "mensaje"; }, 3000);
}

// ---------- LOGIN JWT ----------
document.getElementById("btnLogin").addEventListener("click", async () => {
  const pass = document.getElementById("passAdmin").value;
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });
    const data = await res.json();

    if (data.ok) {
      localStorage.setItem(TOKEN_KEY, data.token);
      document.getElementById("loginAdmin").classList.add("hidden");
      document.getElementById("panelAdmin").classList.remove("hidden");
      document.getElementById("passAdmin").value = "";
      actualizarPanel();
    } else {
      alert(" " + data.mensaje);
    }
  } catch (error) {
    alert(" Error de conexión con el servidor");
  }
});

// Verificar si ya hay sesión activa (token válido)
async function verificarSesion() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      document.getElementById("loginAdmin").classList.add("hidden");
      document.getElementById("panelAdmin").classList.remove("hidden");
      actualizarPanel();
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Si falla la conexión, no hacer nada
  }
}

document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  document.getElementById("loginAdmin").classList.remove("hidden");
  document.getElementById("panelAdmin").classList.add("hidden");
  document.getElementById("passAdmin").value = "";
  if (chartTorta) {
    chartTorta.destroy();
    chartTorta = null;
  }
});

// ---------- Panel Coordinador ----------
async function actualizarPanel() {
  try {
    const statsRes = await fetch(`${API_URL}/stats`, { headers: authHeaders() });
    if (statsRes.status === 401) {
      alert(" Sesión expirada. Ingrese de nuevo.");
      localStorage.removeItem(TOKEN_KEY);
      document.getElementById("loginAdmin").classList.remove("hidden");
      document.getElementById("panelAdmin").classList.add("hidden");
      return;
    }
    const stats = await statsRes.json();

    document.getElementById("totalGeneral").textContent = stats.totalGeneral;
    document.getElementById("totalPersonas").textContent = stats.totalPersonas;

    const escaleras = ['1Baja', '1Media', '1Alta', '2', '3', '4'];
    let htmlEsc = '';
    escaleras.forEach(e => {
      htmlEsc += `
        <div class="stat-esc" style="border-top-color: ${COLORES_ESCALERAS[e]}">
          <div class="nombre">Esc. ${LABELS_ESCALERAS[e]}</div>
          <div class="valor" style="color: ${COLORES_ESCALERAS[e]}">${stats.porEscalera[e] || 0}</div>
        </div>
      `;
    });
    document.getElementById("statsEscaleras").innerHTML = htmlEsc;

    // Actualizar gráfico de torta
    actualizarTorta(stats.porEscalera);
    actualizarTabla();
  } catch (error) {
    alert(" Error al cargar estadísticas");
  }
}

// ---------- GRÁFICO DE TORTA ----------
function actualizarTorta(porEscalera) {
  const ctx = document.getElementById('chartTorta').getContext('2d');
  const escaleras = ['1Baja', '1Media', '1Alta', '2', '3', '4'];
  const labels = escaleras.map(e => 'Esc. ' + LABELS_ESCALERAS[e]);
  const datos = escaleras.map(e => porEscalera[e] || 0);
  const colores = escaleras.map(e => COLORES_ESCALERAS[e]);

  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--text-color').trim();

  if (chartTorta) {
    chartTorta.data.labels = labels;
    chartTorta.data.datasets[0].data = datos;
    chartTorta.data.datasets[0].backgroundColor = colores;
    chartTorta.options.plugins.legend.labels.color = textColor;
    chartTorta.update();
    return;
  }

  chartTorta = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: datos,
        backgroundColor: colores,
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            padding: 15,
            font: { size: 13 }
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const porcentaje = total > 0
                ? ((ctx.parsed / total) * 100).toFixed(1)
                : 0;
              return ` ${ctx.label}: ${ctx.parsed} bombonas (${porcentaje}%)`;
            }
          }
        }
      }
    }
  });
}

// ---------- Tabla de pedidos ----------
async function actualizarTabla() {
  const filtro = document.getElementById("filtroEscalera").value;
  try {
    const res = await fetch(`${API_URL}/pedidos`, { headers: authHeaders() });
    let pedidos = await res.json();

    if (filtro) pedidos = pedidos.filter(p => p.escalera === filtro);

    pedidos.sort((a, b) => {
      const cmp = a.apellidos.localeCompare(b.apellidos, 'es');
      return cmp !== 0 ? cmp : a.nombres.localeCompare(b.nombres, 'es');
    });

    const lista = document.getElementById("listaPedidos");
    lista.innerHTML = "";

    if (pedidos.length === 0) {
      lista.innerHTML = `<div class="sin-registros"> Sin registros</div>`;
      return;
    }

    pedidos.forEach((p, i) => {
      const color = COLORES_ESCALERAS[p.escalera] || '#667eea';
      const card = document.createElement("div");
      card.className = "pedido-card";
      card.style.borderLeftColor = color;
      card.innerHTML = `
        <div class="nombre-completo">${i + 1}. ${p.apellidos}, ${p.nombres}</div>
        <div class="info"> <strong>${p.celular}</strong></div>
        <div class="info"> Escalera: <strong style="color:${color}">${LABELS_ESCALERAS[p.escalera]}</strong></div>
        <div class="info"> Cantidad: <strong>${p.cantidad}</strong></div>
        <div class="acciones">
          <button class="btn-eliminar" data-id="${p.id}">Eliminar</button>
        </div>
      `;
      lista.appendChild(card);
    });

    document.querySelectorAll(".btn-eliminar").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("¿Eliminar este pedido?")) {
          await fetch(`${API_URL}/pedidos/${btn.dataset.id}`, {
            method: 'DELETE',
            headers: authHeaders()
          });
          actualizarPanel();
        }
      });
    });
  } catch (error) {
    alert("Error al cargar pedidos");
  }
}

document.getElementById("filtroEscalera").addEventListener("change", actualizarTabla);

// ---------- MENÚ DROPDOWN PDF ----------
const btnPdf = document.getElementById('btnPdf');
const menuPdf = document.getElementById('menuPdf');

btnPdf.addEventListener('click', (e) => {
  e.stopPropagation();
  menuPdf.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  menuPdf.classList.add('hidden');
});

menuPdf.addEventListener('click', (e) => e.stopPropagation());

// ---------- PDF RESUMEN ----------
document.getElementById('btnPdfResumen').addEventListener('click', async () => {
  menuPdf.classList.add('hidden');
  try {
    const statsRes = await fetch(`${API_URL}/stats`, { headers: authHeaders() });
    const stats = await statsRes.json();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE BOMBONAS', 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 105, 27, { align: 'center' });

    // Totales generales
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Totales Generales', 14, 50);

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 247, 255);
    doc.roundedRect(14, 55, 85, 25, 3, 3, 'F');
    doc.roundedRect(111, 55, 85, 25, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Total Bombonas', 56, 63, { align: 'center' });
    doc.text('Total Personas', 153, 63, { align: 'center' });

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(102, 126, 234);
    doc.text(String(stats.totalGeneral), 56, 75, { align: 'center' });
    doc.text(String(stats.totalPersonas), 153, 75, { align: 'center' });

    // Tabla por escalera
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Escalera', 14, 95);

    const escaleras = ['1Baja', '1Media', '1Alta', '2', '3', '4'];
    const total = stats.totalGeneral || 1;
    const tableData = escaleras.map(e => [
      'Esc. ' + LABELS_ESCALERAS[e],
      String(stats.porEscalera[e] || 0),
      ((stats.porEscalera[e] || 0) / total * 100).toFixed(1) + '%'
    ]);

    doc.autoTable({
      startY: 100,
      head: [['Escalera', 'Bombonas', 'Porcentaje']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { halign: 'center', fontSize: 11 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      margin: { left: 14, right: 14 }
    });

    // Colores en la primera columna
    const finalY = doc.lastAutoTable.finalY;
    let yPos = finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Leyenda de colores:', 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    escaleras.forEach((e, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 14 + col * 65;
      const y = yPos + row * 8;
      const rgb = hexToRgb(COLORES_ESCALERAS[e]);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.circle(x + 3, y - 1.5, 2.5, 'F');
      doc.setTextColor(40, 40, 40);
      doc.text(`Esc. ${LABELS_ESCALERAS[e]}`, x + 8, y);
    });

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Control de Bombonas - Página ${i} de ${pageCount}`,
        105, 290, { align: 'center' }
      );
    }

    doc.save(`resumen_bombonas_${fechaHoy()}.pdf`);
  } catch (err) {
    alert('Error al generar PDF: ' + err.message);
  }
});

// ---------- PDF DETALLADO ----------
document.getElementById('btnPdfDetallado').addEventListener('click', async () => {
  menuPdf.classList.add('hidden');
  try {
    const res = await fetch(`${API_URL}/pedidos`, { headers: authHeaders() });
    const pedidos = await res.json();

    if (pedidos.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Agrupar por escalera
    const escaleras = ['1Baja', '1Media', '1Alta', '2', '3', '4'];
    const grupos = {};
    escaleras.forEach(e => grupos[e] = []);
    pedidos.forEach(p => {
      if (grupos[p.escalera]) grupos[p.escalera].push(p);
    });

    // Ordenar alfabéticamente dentro de cada grupo
    escaleras.forEach(e => {
      grupos[e].sort((a, b) => {
        const cmp = a.apellidos.localeCompare(b.apellidos, 'es');
        return cmp !== 0 ? cmp : a.nombres.localeCompare(b.nombres, 'es');
      });
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DETALLADA DE PEDIDOS', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 105, 23, { align: 'center' });

    let currentY = 40;

    escaleras.forEach(esc => {
      const lista = grupos[esc];
      if (lista.length === 0) return;

      const subtotal = lista.reduce((s, p) => s + p.cantidad, 0);
      const rgb = hexToRgb(COLORES_ESCALERAS[esc]);

      // Verificar espacio
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      // Título de sección con color
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(14, currentY - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Escalera ${LABELS_ESCALERAS[esc]}  (${lista.length} personas - ${subtotal} bombonas)`, 16, currentY);
      currentY += 8;

      // Tabla de esta escalera
      const tableData = lista.map((p, i) => [
        String(i + 1),
        `${p.apellidos}, ${p.nombres}`,
        p.celular,
        String(p.cantidad)
      ]);

      doc.autoTable({
        startY: currentY,
        head: [['#', 'Apellidos, Nombres', 'Celular', 'Cant.']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [rgb.r, rgb.g, rgb.b],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 10;
    });

    // Pie de página en todas las páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Control de Bombonas - Página ${i} de ${pageCount}`,
        105, 290, { align: 'center' }
      );
    }

    doc.save(`lista_detallada_bombonas_${fechaHoy()}.pdf`);
  } catch (err) {
    alert('❌ Error al generar PDF: ' + err.message);
  }
});

// ---------- CSV ----------
document.getElementById("btnExportar").addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_URL}/pedidos`, { headers: authHeaders() });
    const pedidos = await res.json();
    if (pedidos.length === 0) { alert("No hay datos"); return; }

    pedidos.sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'));
    let csv = "Apellidos,Nombres,Celular,Escalera,Cantidad,Fecha\n";
    pedidos.forEach(p => {
      csv += `"${p.apellidos}","${p.nombres}","${p.celular}","${p.escalera}",${p.cantidad},"${p.fecha}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bombonas_${fechaHoy()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { alert("❌ Error al exportar"); }
});

// ---------- Borrar todo ----------
document.getElementById("btnBorrarTodo").addEventListener("click", async () => {
  if (confirm("¿Borrar TODOS los pedidos?")) {
    if (confirm("Última confirmación: ¿Realmente?")) {
      await fetch(`${API_URL}/pedidos`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      actualizarPanel();
      alert("Todos los registros han sido eliminados");
    }
  }
});

// ---------- Utilidades ----------
function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}