// Gera os PDFs fictícios da Biblioteca Digital em public/materiais.
// Uso: node scripts/gerar-materiais.mjs   (sem dependências externas)
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "materiais")
mkdirSync(out, { recursive: true })

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[–—]/g, "-").replace(/[“”]/g, '"')

function wrap(text, max = 88) {
  const lines = []
  for (const para of text.split("\n")) {
    let line = ""
    for (const word of para.split(" ")) {
      if ((line + " " + word).trim().length > max) {
        lines.push(line.trim())
        line = word
      } else line += " " + word
    }
    lines.push(line.trim())
  }
  return lines
}

function pdf(title, subtitle, pages) {
  const objects = []
  const add = (body) => objects.push(body) && objects.length
  const catalog = add(null)
  const pagesObj = add(null)
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
  const bold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
  const kids = []
  pages.forEach((page, i) => {
    let y = 760
    const ops = ["0.027 0.114 0.227 rg 0 792 612 -70 re f", "1 1 1 rg BT /F2 18 Tf 50 750 Td (" + esc(title) + ") Tj ET"]
    ops.push("0.6 0.75 0.95 rg BT /F1 10 Tf 50 733 Td (" + esc(subtitle) + ") Tj ET")
    y = 690
    ops.push("0.027 0.114 0.227 rg BT /F2 14 Tf 50 " + y + " Td (" + esc(page.heading) + ") Tj ET")
    y -= 26
    for (const line of wrap(page.body)) {
      ops.push("0.15 0.2 0.3 rg BT /F1 11 Tf 50 " + y + " Td (" + esc(line) + ") Tj ET")
      y -= 16
    }
    ops.push("0.45 0.5 0.6 rg BT /F1 8 Tf 50 40 Td (" + esc(`Conecta Escola - material fictício de demonstração - página ${i + 1} de ${pages.length}`) + ") Tj ET")
    const stream = Buffer.from(ops.join("\n"), "latin1")
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream.toString("latin1")}\nendstream`)
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Contents ${content} 0 R /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> >>`))
  })
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`
  let body = "%PDF-1.4\n"
  const offsets = []
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(body, "latin1"))
    body += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(body, "latin1")
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`
  body += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(body, "latin1")
}

const docs = {
  "biologia-volume-1.pdf": ["Biologia - Volume 1", "Ciências · 9º ano", [
    { heading: "Capítulo 1 - A célula", body: "A célula é a menor unidade viva. Todos os seres vivos são formados por uma ou mais células.\nCélulas procariontes não têm núcleo organizado; células eucariontes possuem núcleo delimitado por membrana." },
    { heading: "Capítulo 2 - Organelas", body: "Mitocôndrias produzem energia por meio da respiração celular. Cloroplastos, presentes nas plantas, realizam a fotossíntese.\nO retículo endoplasmático e o complexo golgiense participam da produção e do transporte de substâncias." },
    { heading: "Capítulo 3 - Tecidos", body: "Tecidos são conjuntos de células semelhantes que desempenham a mesma função. No corpo humano há quatro tipos principais: epitelial, conjuntivo, muscular e nervoso." },
    { heading: "Capítulo 4 - Níveis de organização", body: "Célula, tecido, órgão, sistema e organismo. Pense em exemplos do seu dia a dia para cada nível e anote no caderno." },
  ]],
  "equacoes-1-grau.pdf": ["Equações do 1º grau", "Matemática · resumo", [
    { heading: "O que é uma equação", body: "Equação é uma igualdade com pelo menos um valor desconhecido (incógnita). Exemplo: 2x + 6 = 14.\nResolver é encontrar o valor que torna a igualdade verdadeira." },
    { heading: "Exemplo resolvido", body: "2x + 6 = 14\n2x = 14 - 6\n2x = 8\nx = 4\nVerificação: 2 · 4 + 6 = 14. Correto!" },
    { heading: "Exercícios", body: "1) 3x - 9 = 0\n2) x/4 = 7\n3) 5x + 2 = 3x + 10\n4) O dobro de um número mais 5 é 25. Qual é o número?" },
  ]],
  "teorema-de-pitagoras.pdf": ["Teorema de Pitágoras", "Matemática · slides da aula", [
    { heading: "Enunciado", body: "Em todo triângulo retângulo, o quadrado da hipotenusa é igual à soma dos quadrados dos catetos: a² = b² + c²." },
    { heading: "Aplicação", body: "Uma escada de 5 m está apoiada em uma parede, com o pé a 3 m da parede. A que altura ela toca a parede?\n5² = 3² + h² -> h² = 16 -> h = 4 m." },
    { heading: "No cotidiano", body: "Construção civil, mapas, telas de TV e celulares (medidas em polegadas da diagonal) usam o teorema." },
  ]],
  "guia-de-redacao.pdf": ["Guia de redação escolar", "Língua Portuguesa", [
    { heading: "Estrutura", body: "Introdução: apresente o tema e sua tese.\nDesenvolvimento: dois parágrafos com argumentos e exemplos.\nConclusão: retome a tese e proponha uma solução." },
    { heading: "Critérios de correção", body: "Adequação ao tema, coerência, coesão, domínio da norma padrão e proposta de intervenção." },
    { heading: "Dicas", body: "Planeje antes de escrever, leia em voz alta e revise a pontuação." },
  ]],
  "revolucao-industrial.pdf": ["Revolução Industrial", "História · texto-base", [
    { heading: "Contexto", body: "Iniciada na Inglaterra no século XVIII, a Revolução Industrial substituiu o trabalho artesanal pela produção em máquinas." },
    { heading: "Consequências", body: "Crescimento das cidades, surgimento da classe operária, novas formas de transporte e mudanças profundas nas relações de trabalho." },
    { heading: "Para o trabalho", body: "Escolha uma consequência e relacione com o mundo atual. Use pelo menos duas referências." },
  ]],
  "biomas-brasileiros.pdf": ["Biomas brasileiros", "Geografia · atlas ilustrado", [
    { heading: "Amazônia", body: "Maior floresta tropical do mundo, com enorme biodiversidade e a maior bacia hidrográfica do planeta." },
    { heading: "Outros biomas", body: "Cerrado, Mata Atlântica, Caatinga, Pampa e Pantanal: cada um com clima, vegetação e fauna próprios." },
    { heading: "Atividade", body: "Monte um mapa com os seis biomas e indique uma ameaça e uma ação de preservação para cada um." },
  ]],
  "cartilha-sustentabilidade.pdf": ["Sustentabilidade na escola", "Cartilha da Semana da Sustentabilidade", [
    { heading: "Água", body: "Feche a torneira ao escovar os dentes e avise a coordenação sobre vazamentos." },
    { heading: "Energia", body: "Apague as luzes ao sair da sala e aproveite a iluminação natural." },
    { heading: "Resíduos", body: "Separe recicláveis e orgânicos. Reutilize folhas e materiais sempre que possível." },
  ]],
  "present-perfect.pdf": ["Present perfect", "Inglês · grammar guide", [
    { heading: "Form", body: "Subject + have/has + past participle. Example: I have finished my homework." },
    { heading: "Use", body: "Experiences (I have visited Manaus), recent actions (She has just arrived) and unfinished time (We have studied a lot this week)." },
  ]],
}

for (const [file, [title, subtitle, pages]] of Object.entries(docs)) writeFileSync(join(out, file), pdf(title, subtitle, pages))
console.log(`${Object.keys(docs).length} PDFs gerados em public/materiais`)
