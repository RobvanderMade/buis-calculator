<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js">
 </script>
 <meta>
 
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 
 <title>
  Buis Visualisatie
 </title>
 <style>
  body {
      font-family: Arial, sans-serif;
      margin: 20px;
  }
  .container {
      display: flex;
      gap: 20px;
  }
  svg {
      border: 1px solid #ddd;
      background-color: #f9f9f9;
  }
  table {
      border-collapse: collapse;
      width: 450px;
      table-layout: fixed; /* Forceert vaste kolombreedte */
  }
  table, th, td {
      border: 1px solid #ddd;
      text-align: center;
  }
  th, td {
      padding: 8px;
  }
  th, td {
      width: 40px; /*breedte kolommen*/
  }
  .grid {
      background-image: linear-gradient(to right, #e0e0e0 1px, transparent 1px),
                        linear-gradient(to bottom, #e0e0e0 1px, transparent 1px);
      background-size: 5mm 5mm;
  }
 </style>
 <div class="container">
  <div>
   <label for="materiaal">
    <strong>
     Kies materiaal &amp; radius:
    </strong>
   </label>
   <select id="materiaal" onchange="updateMaterial()">
   </select>
   <br>
   <br>
   <table id="coordinateTable">
    <thead>
     <tr>
      <th>
       Regel
      </th>
      <th>
       X (mm)
      </th>
      <th>
       Y (mm)
      </th>
      <th>
       Z (mm)
      </th>
      <th>
       Lengte (mm)
      </th>
     </tr>
    </thead>
    <tbody>
     <tr>
      <td>
       Regel 1
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td class="line-length">
       0
      </td>
      <!-- Lengte wordt hier weergegeven -->
     </tr>
     <tr>
      <td>
       Regel 2
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td class="line-length">
       0
      </td>
      <!-- Lengte wordt hier weergegeven -->
     </tr>
     <tr>
      <td>
       Regel 3
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td>
       <input type="number" value="0" oninput="updateLineLengths()">
      </td>
      <td class="line-length">
       0
      </td>
      <!-- Lengte wordt hier weergegeven -->
     </tr>
    </tbody>
   </table>
   <br>
   <button onclick="addRow()">
    Voeg een regel toe
   </button>
   <button onclick="resetFields()">
    Reset
   </button>
   <br>
   <br>
   <button onclick="validateLines()" style="background-color: #b6f9b6;">
    Invoer Controleren
   </button>
   <br>
   <br>
   <label for="totalLength">
    Gestrekte lengte (maximaal 6000 mm):
   </label>
   <input type="number" id="totalLength" readonly="">
   <br>
   <br>
   <label for="aantalStuks">
    Aantal stuks:
   </label>
   <input type="number" id="aantalStuks" value="1" min="1" onchange="updateTotalPrice()">
   <br>
   <br>
   <button onclick="drawPipe()">
    Berekenen
   </button>
   <br>
   <br>
   <label for="prijsPerStuk">
    Prijs per stuk (in €):
   </label>
   <input type="text" id="prijsPerStuk" readonly="">
   <br>
   <br>
   <label for="totalePrijs">
    Totaal bedrag (in €):
   </label>
   <input type="text" id="totalePrijs" readonly="">
   <br>
   <br>
   <p>
    Is de invoer gecontroleerd? Sla dan de gegevens op als PDF-bestand en verzend dit met de aanvraag via het menu hierboven
   </p>
   <br>
   <button type="button" class="export-btn" onclick="exportToPDF()">
    Opslaan als PDF-bestand
   </button>
  </div>
  <div>
   <button onclick="setView('XY')">
    Vooraanzicht (XY)
   </button>
   <button onclick="setView('XZ')">
    Bovenaanzicht (XZ)
   </button>
   <button onclick="setView('YZ')">
    Zijaanzicht (YZ)
   </button>
   <div>
    <br>
    <br>
    <svg id="canvas" class="grid" width="800" height="600">
    </svg>
   </div>
  </div>
  <script>
   function addRow() {
const table = document.getElementById('coordinateTable').getElementsByTagName('tbody')[0];
// Maak een nieuwe rij
const newRow = document.createElement('tr');
// Maak de cellen van de nieuwe rij
const regelCell = document.createElement('td');
regelCell.textContent = `Regel ${table.rows.length + 1}`;
newRow.appendChild(regelCell);
// Maak de inputvelden voor X, Y, Z
for (let i = 0; i < 3; i++) {
    const cell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.value = 0;
    input.oninput = updateLineLengths;
    cell.appendChild(input);
    newRow.appendChild(cell);
}
// Maak de cel voor lengte
const lengthCell = document.createElement('td');
lengthCell.className = 'line-length';
lengthCell.textContent = '0'; // Initialiseer met 0
newRow.appendChild(lengthCell);
// Voeg de nieuwe rij toe aan de tabel
table.appendChild(newRow);
// Voeg de eventlistener toe aan de nieuwe inputvelden
addTableEventListeners();
}
function updateLineLengths() {
const table = document.getElementById('coordinateTable');
const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
let prevX = 0, prevY = 0, prevZ = 0;
for (let row of rows) {
  const inputs = row.getElementsByTagName('input');
  const x = parseInt(inputs[0].value) || 0;
  const y = parseInt(inputs[1].value) || 0;
  const z = parseInt(inputs[2].value) || 0;
  // Bereken de lengte van de lijn
  const length = Math.sqrt(
      Math.pow(x, 2) + 
      Math.pow(y, 2) + 
      Math.pow(z, 2)
  );
  // Update de lengte in de tabel
  const lengthCell = row.querySelector('.line-length');
  lengthCell.textContent = length.toFixed(2);
  // Update de vorige coördinaten
  prevX += x;
  prevY += y;
  prevZ += z;
}
}
// Voeg een eventlistener toe aan elk inputveld in de tabel
const inputs = document.querySelectorAll('#coordinateTable input');
inputs.forEach(input => input.addEventListener('input', updateLineLengths));
// Roep de functie aan bij het laden van de pagina om de waarden te initialiseren
updateLineLengths();
  const { jsPDF } = window.jspdf; // Zorg ervoor dat jsPDF beschikbaar is
// Functie om gegevens naar een PDF te exporteren
function exportToPDF() {
const doc = new jsPDF();
// Titel
doc.setFontSize(16);
doc.text('Online Calculator Buis Buigen - Vandema Products', 10, 10);
// Materiaal
const materiaalSelect = document.getElementById('materiaal');
const selectedMaterial = materiaalSelect.selectedOptions[0].text;
doc.setFontSize(12);
doc.text(`Materiaal: ${selectedMaterial}`, 10, 30);
// Coördinaten
doc.text('Coördinaten:', 10, 40);
const table = document.getElementById('coordinateTable');
const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
let yPosition = 50;
for (let i = 0; i < rows.length; i++) {
  const inputs = rows[i].getElementsByTagName('input');
  const x = inputs[0].value;
  const y = inputs[1].value;
  const z = inputs[2].value;
  const rowText = `Regel ${i + 1}: X=${x} Y=${y} Z=${z}`;
  doc.text(rowText, 10, yPosition);
  yPosition += 10;
}
// Totale lengte en prijs per stuk
const totalLength = document.getElementById('totalLength').value;
const prijsPerStuk = document.getElementById('prijsPerStuk').value;
const aantalStuks = document.getElementById('aantalStuks').value;
// Aantal stuks
yPosition += 10;
doc.text(`Aantal stuks: ${aantalStuks}`, 10, yPosition);
yPosition += 10;
doc.text(`Prijs per stuk: ${prijsPerStuk}`, 10, yPosition);
yPosition += 10;
doc.text(`De prijzen zijn exclusief 21% BTW en onder voorbehoud van goedkeuring door onze engineer`, 10, yPosition);
yPosition += 10;
doc.text('Andere bewerkingen zoals restlengte inkorten, lassen etc. op aanvraag', 10, yPosition);
// Opslaan als PDF
doc.save('buis_berekeningen.pdf');
}
  const database = [
  { materiaal: "Ø13x1.5mm R=41", prijsPerMTR: 1.84, klemLengte: 40, radius: 41 },
      { materiaal: "Ø16x2mm R=32", prijsPerMTR: 2.30, klemLengte: 65, radius: 32 },
      { materiaal: "Ø19x1.5mm R=45", prijsPerMTR: 2.26, klemLengte: 50, radius: 45 },
      { materiaal: "Ø22x2mm R=60", prijsPerMTR: 5.20, klemLengte: 55, radius: 60 },
      { materiaal: "Ø22x2mm R=70", prijsPerMTR: 5.20, klemLengte: 65, radius: 60 },
      { materiaal: "Ø25,4x2mm R=50.8", prijsPerMTR: 3.96, klemLengte: 55, radius: 50.8 },
      { materiaal: "Ø25,4x2mm R=100 (alleen 2-D)", prijsPerMTR: 3.96, klemLengte: 100,  radius: 100 },
      { materiaal: "Ø30x1.5mm R=60", prijsPerMTR: 4.24, klemLengte: 70, radius: 60 },
      { materiaal: "Ø30x1.5mm R=85", prijsPerMTR: 4.24, klemLengte: 75, radius: 85 },
      { materiaal: "Ø30x2.5mm R=60", prijsPerMTR: 6.01, klemLengte: 70, radius: 60 },
      { materiaal: "Ø30x2.5mm R=85", prijsPerMTR: 6.01, klemLengte: 75, radius: 85 },
      { materiaal: "Ø32x2mm R=74", prijsPerMTR: 7.50, klemLengte: 80, radius: 74 },
      { materiaal: "Ø32x2mm R=142", prijsPerMTR: 7.50, klemLengte: 80, radius: 142 },
      { materiaal: "Ø32x3mm R=74", prijsPerMTR: 7.50, klemLengte: 80, radius: 74 },
      { materiaal: "Ø32x3mm R=142", prijsPerMTR: 7.50, klemLengte: 80, radius: 142 },
      { materiaal: "Ø38x2mm R=76", prijsPerMTR: 7.50, klemLengte: 110, radius: 76 },
      { materiaal: "Ø38x3mm R=76", prijsPerMTR: 19.16, klemLengte: 110, radius: 76 }
  ];
  const materiaalSelect = document.getElementById('materiaal');
  const aantalStuksInput = document.getElementById('aantalStuks');
  database.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = item.materiaal;
      materiaalSelect.appendChild(option);
  });
  function updateMaterial() {
      updateTotalPrice();
  }
  function updateTotalPrice() {
const selectedMaterial = database[materiaalSelect.value];
const prijsPerMTR = selectedMaterial ? selectedMaterial.prijsPerMTR : 0;
const aantalStuks = parseInt(aantalStuksInput.value) || 1;
const table = document.getElementById('coordinateTable');
const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
const lines = [];
for (let row of rows) {
  const inputs = row.getElementsByTagName('input');
  const x = parseInt(inputs[0].value) || 0;
  const y = parseInt(inputs[1].value) || 0;
  const z = parseInt(inputs[2].value) || 0;
  lines.push({ x, y, z });
}
const totalLength = calculateTotalLength(lines);
document.getElementById('totalLength').value = totalLength.toFixed(2);
const prijsPerStuk = calculatePricePerStuk(totalLength, prijsPerMTR, aantalStuks);
document.getElementById('prijsPerStuk').value = prijsPerStuk.toFixed(2) + " €";
const totalePrijs = prijsPerStuk * aantalStuks;
document.getElementById('totalePrijs').value = totalePrijs.toFixed(2) + " €";
}
  function resetFields() {
      const inputs = document.querySelectorAll('#coordinateTable input');
      inputs.forEach(input => input.value = 0);
      drawPipe();
  }
// Voeg de calculateLineLengths functie toe
function calculateLineLengths(lines) {
const lengths = [];
for (const line of lines) {
  // Bereken lengte van de regel alleen op basis van start- en eindpunt van de regel zelf
  const length = Math.sqrt(
      Math.pow(line.end.x - line.start.x, 2) +
      Math.pow(line.end.y - line.start.y, 2) +
      Math.pow(line.end.z - line.start.z, 2)
  );
  lengths.push(length); // Voeg lengte toe aan lijst
}
return lengths;
}
// Update de calculateTotalLength functie om de line lengths te gebruiken
function calculateTotalLength(lines) {
// Eerst de regels omzetten naar een array van start- en eindpunten
const coordinates = [];
let prevX = 0, prevY = 0, prevZ = 0;
lines.forEach((line) => {
  const nextX = prevX + line.x;
  const nextY = prevY + line.y;
  const nextZ = prevZ + line.z;
  coordinates.push({ start: { x: prevX, y: prevY, z: prevZ }, end: { x: nextX, y: nextY, z: nextZ } });
  prevX = nextX;
  prevY = nextY;
  prevZ = nextZ;
});
// Bereken de lengtes met de nieuwe calculateLineLengths functie
const lengths = calculateLineLengths(coordinates);
// Sommeer de lengtes
return lengths.reduce((total, length) => total + length, 0);
}
function validateLines() {
const table = document.getElementById('coordinateTable');
const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
const selectedMaterial = database[materiaalSelect.value];
const klemLengte = selectedMaterial.klemLengte;
const radius = selectedMaterial.radius;
// Array to hold the lengths of lines
const lines = [];
let prevX = 0, prevY = 0, prevZ = 0;
for (let i = 0; i < rows.length; i++) {
  const inputs = rows[i].getElementsByTagName('input');
  const x = parseInt(inputs[0].value) || 0;
  const y = parseInt(inputs[1].value) || 0;
  const z = parseInt(inputs[2].value) || 0;
  if (x !== 0 || y !== 0 || z !== 0) {
      // Calculate the length of the line
      const length = Math.sqrt(
          Math.pow(prevX + x - prevX, 2) +
          Math.pow(prevY + y - prevY, 2) +
          Math.pow(prevZ + z - prevZ, 2)
      );
      lines.push({ length, i, x, y, z }); // Store the line data
  }
  prevX += x;
  prevY += y;
  prevZ += z;
}
// Check first line (must be > klemLengte + radius)
if (lines.length > 0) {
  const firstLine = lines[0];
  if (firstLine.length <= klemLengte + radius) {
      alert(`De eerste lijn is te kort. Deze moet langer zijn dan ${klemLengte + radius}mm.`);
      return;
  }
}
// Check last line (must be >= 280mm)
const lastLine = lines[lines.length - 1];
if (lastLine.length < 280) {
  alert(`De laatste lijn is te kort. Deze moet minimaal 280mm zijn.`);
  return;
}
// Check all lines in between (must be > klemLengte + (2 * radius))
for (let i = 1; i < lines.length - 1; i++) {
  const line = lines[i];
  if (line.length <= klemLengte + (2 * radius)) {
      alert(`Lijn ${line.i + 1} is te kort. Deze moet langer zijn dan ${klemLengte + 2 * radius}mm.`);
      return;
  }
}
alert('Alle lijnen zijn correct! Je kunt doorgaan.');
}
  function calculatePricePerStuk(totalLength, prijsPerMTR, aantalStuks) {
      let pricePerPiece = 0.00;
      const pricePerLine = 2.00;
      const table = document.getElementById('coordinateTable');
      const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
      let totalLines = 0;
      for (let i = 1; i < rows.length; i++) {
          const inputs = rows[i].getElementsByTagName('input');
          const x = parseInt(inputs[0].value) || 0;
          const y = parseInt(inputs[1].value) || 0;
          const z = parseInt(inputs[2].value) || 0;
          if (x !== 0 || y !== 0 || z !== 0) {
              totalLines++;
          }
          if (totalLength >= 6000) {
            alert(`De totale lengte is te lang. Deze moet korter zijn dan 6000mm.`);
       return;
          }
      }
      pricePerPiece += totalLines * pricePerLine;
      const pricePerTube = 6 * prijsPerMTR;
      const stuksUitBuis = Math.floor(5980 / totalLength);
      pricePerPiece += pricePerTube / stuksUitBuis;
      return pricePerPiece += (60.00 / aantalStuks);
  }
  let currentView = 'XY'; // Track the current view
function setView(view) {
currentView = view; // Change the view
drawPipe();         // Redraw the pipe
}
function drawAxes(canvas) {
 const axisLength = 50; // Lengte van de assen in pixels
 const padding = 20; // Afstand van de rand van het canvas
 const arrowSize = 5; // Grootte van de pijlpunt
 // Wis eerdere assen
 canvas.innerHTML = '';
 if (currentView === 'XY') {
     // X-as (rood)
     drawLine(canvas, padding, padding, padding + axisLength, padding, 'red');
     drawArrow(canvas, padding + axisLength, padding, arrowSize, 'red', 0);
     drawAxisLabel(canvas, padding + axisLength + 10, padding, 'X', 'red');
     // Y-as (groen)
     drawLine(canvas, padding, padding, padding, padding + axisLength, 'green');
     drawArrow(canvas, padding, padding + axisLength, arrowSize, 'green', -90);
     drawAxisLabel(canvas, padding, padding + axisLength + 15, 'Y', 'green');
 } else if (currentView === 'XZ') {
     // X-as (rood)
     drawLine(canvas, padding, padding, padding + axisLength, padding, 'red');
     drawArrow(canvas, padding + axisLength, padding, arrowSize, 'red', 0);
     drawAxisLabel(canvas, padding + axisLength + 10, padding, 'X', 'red');
     // Z-as (blauw)
     drawLine(canvas, padding, padding, padding, padding + axisLength, 'blue');
     drawArrow(canvas, padding, padding + axisLength, arrowSize, 'blue', -90);
     drawAxisLabel(canvas, padding, padding + axisLength + 15, 'Z', 'blue');
 } else if (currentView === 'YZ') {
     // Z-as (blauw)
     drawLine(canvas, padding, padding, padding + axisLength, padding, 'blue');
     drawArrow(canvas, padding + axisLength, padding, arrowSize, 'bleu', 0);
     drawAxisLabel(canvas, padding + axisLength + 10, padding, 'Z', 'blue');
     // Y-as (groen)
     drawLine(canvas, padding, padding, padding, padding + axisLength, 'green');
     drawArrow(canvas, padding, padding + axisLength, arrowSize, 'green', -90);
     drawAxisLabel(canvas, padding, padding + axisLength + 15, 'Y', 'green');
 }
}
function drawAxisLabel(canvas, x, y, label, color) {
 const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
 text.setAttribute('x', x);
 text.setAttribute('y', y);
 text.setAttribute('fill', color);
 text.setAttribute('font-size', '14px');
 text.textContent = label;
 canvas.appendChild(text);
}
function drawArrow(canvas, x, y, size, color, angle = 0) {
 // Bepaal de punten van de pijlpunt
 const radians = angle * (Math.PI / 180); // Converteer hoek naar radialen
 const cos = Math.cos(radians);
 const sin = Math.sin(radians);
 const points = [
     { x: x, y: y }, // Punt van de pijl
     { x: x - size * cos - size * sin, y: y + size * sin - size * cos }, // Linkerpunt van de basis
     { x: x - size * cos + size * sin, y: y + size * sin + size * cos }, // Rechterpunt van de basis
 ];
 // Maak een polygon voor de pijl
 const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
 arrowHead.setAttribute(
     'points',
     points.map((p) => `${p.x},${p.y}`).join(' ')
 );
 arrowHead.setAttribute('fill', color);
 canvas.appendChild(arrowHead);
}
function drawAxisLabel(canvas, x, y, label, color) {
 const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
 text.setAttribute('x', x);
 text.setAttribute('y', y);
 text.setAttribute('fill', color);
 text.setAttribute('font-size', '16px');
 text.textContent = label;
 canvas.appendChild(text);
}
function drawPipe() {
updateTotalPrice();
const table = document.getElementById('coordinateTable');
const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
const coordinates = [];
let minX = 0, minY = 0, minZ = 0, maxX = 0, maxY = 0, maxZ = 0;
let currentX = 0, currentY = 0, currentZ = 0;
for (let row of rows) {
    const inputs = row.getElementsByTagName('input');
    const x = parseInt(inputs[0].value) || 0;
    const y = parseInt(inputs[1].value) || 0;
    const z = parseInt(inputs[2].value) || 0;
    currentX += x;
    currentY += y;
    currentZ += z;
    coordinates.push({ x: currentX, y: currentY, z: currentZ });
    minX = Math.min(minX, currentX);
    minY = Math.min(minY, currentY);
    minZ = Math.min(minZ, currentZ);
    maxX = Math.max(maxX, currentX);
    maxY = Math.max(maxY, currentY);
    maxZ = Math.max(maxZ, currentZ);
}
const canvas = document.getElementById('canvas');
canvas.innerHTML = ''; // Wis eerdere tekeningen
drawAxes(canvas); // Voeg de assen toe
const canvasWidth = canvas.getAttribute('width');
const canvasHeight = canvas.getAttribute('height');
const padding = 30;
const scaleX = (canvasWidth - 2 * padding) / (maxX - minX || 1);
const scaleY = (canvasHeight - 2 * padding) / (maxY - minY || 1);
const scaleZ = (canvasHeight - 2 * padding) / (maxZ - minZ || 1);
const scale = Math.min(scaleX, scaleY, scaleZ);
const offsetX = -minX * scale + padding;
const offsetY = -minY * scale + padding;
const offsetZ = -minZ * scale + padding;
const colors = ['blue', 'red', 'green', 'orange', 'purple', 'cyan'];
let colorIndex = 0;
let prevX = offsetX, prevY = offsetY, prevZ = offsetZ;
let prevDirection = null;
coordinates.forEach((coord, index) => {
    const nextX = coord.x * scale + offsetX;
    const nextY = coord.y * scale + offsetY;
    const nextZ = coord.z * scale + offsetZ;
    const color = colors[colorIndex];
    colorIndex = (colorIndex + 1) % colors.length;
    if (currentView === 'XY') {
        drawLine(canvas, prevX, prevY, nextX, nextY, color);
        const direction = { dx: nextX - prevX, dy: nextY - prevY };
        if (index > 0) {
            const angle = calculateAngle(prevDirection, direction);
            drawAngleLabel(canvas, (prevX + nextX) / 2, (prevY + nextY) / 2, angle);
        }
        prevDirection = direction;
    } else if (currentView === 'XZ') {
        drawLine(canvas, prevX, prevZ, nextX, nextZ, color);
        const direction = { dx: nextX - prevX, dz: nextZ - prevZ };
        if (index > 0) {
            const angle = calculateAngle(prevDirection, direction);
            drawAngleLabel(canvas, (prevX + nextX) / 2, (prevZ + nextZ) / 2, angle);
        }
        prevDirection = direction;
    } else if (currentView === 'YZ') {
        drawLine(canvas, prevZ, prevY, nextZ, nextY, color);
        const direction = { dz: nextZ - prevZ, dy: nextY - prevY };
        if (index > 0) {
            const angle = calculateAngle(prevDirection, direction);
            drawAngleLabel(canvas, (prevZ + nextZ) / 2, (prevY + nextY) / 2, angle);
        }
        prevDirection = direction;
    }
    prevX = nextX;
    prevY = nextY;
    prevZ = nextZ;
});
}
function calculateAngle(v1, v2) {
const dotProduct = (v1.dx || 0) * (v2.dx || 0) + (v1.dy || 0) * (v2.dy || 0) + (v1.dz || 0) * (v2.dz || 0);
const magnitude1 = Math.sqrt((v1.dx || 0) ** 2 + (v1.dy || 0) ** 2 + (v1.dz || 0) ** 2);
const magnitude2 = Math.sqrt((v2.dx || 0) ** 2 + (v2.dy || 0) ** 2 + (v2.dz || 0) ** 2);
const angle = Math.acos(dotProduct / (magnitude1 * magnitude2)) * (180 / Math.PI);
return angle.toFixed(1);
}
function drawAngleLabel(canvas, x, y, angle) {
const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
text.setAttribute('x', x);
text.setAttribute('y', y - 10);
text.setAttribute('fill', 'black');
text.setAttribute('font-size', '16px');
text.textContent = `${angle}°`;
canvas.appendChild(text);
}
function drawLine(canvas, x1, y1, x2, y2, color) {
const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
line.setAttribute('x1', x1);
line.setAttribute('y1', y1);
line.setAttribute('x2', x2);
line.setAttribute('y2', y2);
line.setAttribute('stroke', color);
line.setAttribute('stroke-width', 4);
canvas.appendChild(line);
}
  function addTableEventListeners() {
      const table = document.getElementById('coordinateTable');
      const inputs = table.getElementsByTagName('input');
      for (let input of inputs) {
          input.addEventListener('input', drawPipe);
      }
  }
  addTableEventListeners();
  updateMaterial();
  </script>
 </div>