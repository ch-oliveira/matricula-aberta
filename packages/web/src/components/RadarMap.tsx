import { useId, useState } from 'react';
import { STATUS_INFO } from '../domain/etapas';
import { formatarDistancia } from '../domain/geo';
import type { Local, Resultado } from '../domain/types';
import { Icone, IconeStatus } from './Icone';

interface Props {
  centro: Local;
  raioKm: number;
  resultados: Resultado[];
  onSelecionar: (id: string) => void;
}

/**
 * Converte coordenadas de Patos - PB (lat/lng) para pixels SVG (viewBox 0 0 840 560).
 * Bounding Box calibrado com a malha urbana oficial de Patos - PB (IBGE 2510808).
 */
function projetarCoordenadas(lat: number, lng: number): { x: number; y: number } {
  const minLng = -37.305;
  const maxLng = -37.245;
  const minLat = -7.055;
  const maxLat = -6.995;

  const x = Math.round(((lng - minLng) / (maxLng - minLng)) * 840);
  const y = Math.round(((maxLat - lat) / (maxLat - minLat)) * 560);
  return {
    x: Math.max(28, Math.min(812, x)),
    y: Math.max(28, Math.min(532, y)),
  };
}

/**
 * Mapa cartográfico vetorial interativo de Patos - PB com as creches e escolas municipais.
 * Exibe a malha urbana real (BR-230, BR-361, BR-110, Alça Sudeste, Rio Espinharas e bairros).
 */
export function RadarMap({ centro, raioKm, resultados, onSelecionar }: Props) {
  const [focoId, setFocoId] = useState<string | null>(null);
  const mapDescId = useId();

  const centroPos = projetarCoordenadas(centro.lat, centro.lng);
  // Escala: 0.060 graus de longitude em Patos equivalem a ~6.62 km
  const pixelsPorKm = 840 / 6.62;
  const raioPixels = Math.round(raioKm * pixelsPorKm);

  const abertas = resultados.filter((r) => r.status === 'aberta').length;
  const ultimas = resultados.filter((r) => r.status === 'ultimas').length;
  const espera = resultados.filter((r) => r.status === 'espera').length;

  return (
    <div className="mapa-patos-vagas-wrapper" role="region" aria-labelledby={mapDescId}>
      {/* Barra de cabeçalho do mapa */}
      <div className="mapa-vagas-topo">
        <div>
          <span className="lp-mini-tag">Cartografia Oficial · Patos - PB</span>
          <h3 id={mapDescId} className="mapa-vagas-titulo">
            <Icone nome="map" tamanho={18} /> Mapa da Rede Municipal ({resultados.length} unidades no raio)
          </h3>
        </div>

        <div className="mapa-vagas-legendas">
          <span className="legenda-pill l-aberta">
            <IconeStatus status="aberta" tamanho={14} /> <strong>{abertas}</strong> com vaga
          </span>
          <span className="legenda-pill l-ultimas">
            <IconeStatus status="ultimas" tamanho={14} /> <strong>{ultimas}</strong> últimas
          </span>
          <span className="legenda-pill l-espera">
            <IconeStatus status="espera" tamanho={14} /> <strong>{espera}</strong> em espera
          </span>
        </div>
      </div>

      <div className="mapa-vagas-canvas-container">
        <svg
          className="mapa-patos-svg"
          viewBox="0 0 840 560"
          role="img"
          aria-label={`Mapa com ${resultados.length} escolas municipais num raio de ${raioKm} km de ${centro.rotulo}`}
        >
          <defs>
            <radialGradient id="gradiente-raio-vagas" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4338CA" stopOpacity="0.12" />
              <stop offset="85%" stopColor="#4338CA" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#4338CA" stopOpacity="0" />
            </radialGradient>
            <filter id="sombra-pin" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#171625" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Fundo cartográfico */}
          <rect width="840" height="560" fill="var(--bg)" rx="16" />

          {/* Círculo do raio de busca a partir do bairro */}
          <circle
            cx={centroPos.x}
            cy={centroPos.y}
            r={raioPixels}
            fill="url(#gradiente-raio-vagas)"
            stroke="#4338CA"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.75"
          />

          {/* ================= MALHA HIDROGRÁFICA: RIO ESPINHARAS ================= */}
          <path
            d="M 30,440 Q 150,420 280,360 T 460,350 T 600,340 T 820,330"
            fill="none"
            stroke="#67C2DF"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.55"
          />
          <text x="460" y="375" fontSize="11" fontWeight="700" fill="#2E7E99" textAnchor="middle">
            Rio Espinharas · Patos - PB
          </text>

          {/* ================= RODOVIAS PRINCIPAIS DE PATOS ================= */}
          {/* BR-230: Transamazônica (Noroeste -> Leste) */}
          <path
            d="M 20,70 L 220,70 L 360,180 L 700,185 L 820,220"
            fill="none"
            stroke="#171625"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 20,70 L 220,70 L 360,180 L 700,185 L 820,220"
            fill="none"
            stroke="#FFE072"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="130" y="58" fontSize="11" fontWeight="900" fill="#171625">
            BR-230 (Transamazônica)
          </text>

          {/* BR-361: Vale do Piancó (Oeste -> Leste) */}
          <path
            d="M 20,300 L 240,295 L 390,274 L 610,230 L 820,225"
            fill="none"
            stroke="#171625"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 20,300 L 240,295 L 390,274 L 610,230 L 820,225"
            fill="none"
            stroke="#FFE072"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <text x="120" y="318" fontSize="11" fontWeight="900" fill="#171625">
            BR-361 (Sentido Piancó)
          </text>

          {/* BR-110: Norte-Sul */}
          <path
            d="M 360,20 L 360,180 L 390,274 L 415,405 L 455,480 L 460,550"
            fill="none"
            stroke="#171625"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 360,20 L 360,180 L 390,274 L 415,405 L 455,480 L 460,550"
            fill="none"
            stroke="#FFE072"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <text x="375" y="45" fontSize="11" fontWeight="900" fill="#171625">
            BR-110 (Norte)
          </text>

          {/* Alça Sudeste */}
          <path
            d="M 700,185 Q 730,320 580,450"
            fill="none"
            stroke="#818CF8"
            strokeWidth="3.5"
            strokeDasharray="6 3"
          />
          <text x="735" y="320" fontSize="10" fontWeight="800" fill="#4338CA">
            Alça Sudeste
          </text>

          {/* Rótulos cartográficos dos bairros principais de fundo */}
          {[
            { nome: 'Noé Trajano', x: 215, y: 105 },
            { nome: 'Belo Horizonte', x: 345, y: 160 },
            { nome: 'São Sebastião', x: 550, y: 160 },
            { nome: 'Vitória', x: 700, y: 150 },
            { nome: 'Centro', x: 395, y: 260 },
            { nome: 'Liberdade', x: 235, y: 275 },
            { nome: 'Maternidade', x: 240, y: 345 },
            { nome: 'Salgadinho', x: 630, y: 255 },
            { nome: 'Monte Castelo', x: 420, y: 430 },
            { nome: 'Jatobá', x: 460, y: 510 },
          ].map((b) => (
            <text
              key={b.nome}
              x={b.x}
              y={b.y}
              fontSize="11"
              fontWeight="800"
              fill="var(--muted)"
              opacity="0.45"
              textAnchor="middle"
            >
              {b.nome}
            </text>
          ))}

          {/* Ponto de partida do usuário (Centro / Bairro escolhido) */}
          <g className="mapa-pin-voce" transform={`translate(${centroPos.x}, ${centroPos.y})`}>
            <circle r="22" fill="#FFE072" stroke="#171625" strokeWidth="3" filter="url(#sombra-pin)" />
            <circle r="28" fill="none" stroke="#FFE072" strokeWidth="2" opacity="0.6" className="anim-pulso" />
            <text y="5" textAnchor="middle" fontSize="15">
              🏠
            </text>
            <rect x="-60" y="28" width="120" height="20" rx="5" fill="#171625" />
            <text x="0" y="42" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFFFF">
              {centro.rotulo} (Você)
            </text>
          </g>

          {/* ================= PINS DAS ESCOLAS NO MAPA ================= */}
          {resultados.map((r) => {
            const pos = projetarCoordenadas(r.escola.lat, r.escola.lng);
            const emFoco = focoId === r.escola.id;
            const corStatus = r.status === 'aberta' ? '#22C55E' : r.status === 'ultimas' ? '#F59E0B' : '#EF4444';
            const nomeCurto = r.escola.nome.replace(/^(Creche Municipal|CMEI|EMEI|EMEF)\s+/i, '');

            return (
              <g
                key={r.escola.id}
                className={`mapa-pin-escola pin-${r.status} ${emFoco ? 'pin-em-foco' : ''}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onSelecionar(r.escola.id)}
                onMouseEnter={() => setFocoId(r.escola.id)}
                onMouseLeave={() => setFocoId(null)}
                style={{ cursor: 'pointer' }}
                tabIndex={0}
                role="button"
                aria-label={`${r.escola.nome}, ${formatarDistancia(r.distanciaKm)}, ${STATUS_INFO[r.status].rotulo}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelecionar(r.escola.id);
                  }
                }}
              >
                {/* Halo pulsante para escolas com vaga */}
                {r.status === 'aberta' && (
                  <circle r="18" fill={corStatus} opacity="0.25" className="anim-pulso" />
                )}

                {/* Marcador do pino */}
                <circle
                  r="14"
                  fill={corStatus}
                  stroke="#171625"
                  strokeWidth="2.5"
                  filter="url(#sombra-pin)"
                />
                <circle r="5" fill="#FFFFFF" />

                {/* Plaqueta com nome e distância */}
                <g transform="translate(0, 20)">
                  <rect
                    x="-65"
                    y="0"
                    width="130"
                    height="32"
                    rx="6"
                    fill="var(--surface)"
                    stroke="#171625"
                    strokeWidth="1.8"
                    filter="url(#sombra-pin)"
                  />
                  <text
                    x="0"
                    y="13"
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="900"
                    fill="var(--text)"
                  >
                    {nomeCurto.length > 18 ? `${nomeCurto.slice(0, 16)}…` : nomeCurto}
                  </text>
                  <text
                    x="0"
                    y="25"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="800"
                    fill={corStatus}
                  >
                    {r.status === 'espera' ? 'Lista de espera' : `${r.oferta.vagas} vagas · ${formatarDistancia(r.distanciaKm)}`}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Rosa dos Ventos */}
          <g transform="translate(790, 48)">
            <circle r="16" fill="var(--surface)" stroke="#171625" strokeWidth="1.5" />
            <polygon points="0,-12 3,0 0,2 -3,0" fill="#EF4444" />
            <polygon points="0,12 3,0 0,-2 -3,0" fill="#171625" />
            <text x="0" y="-14" textAnchor="middle" fontSize="9" fontWeight="900" fill="#171625">
              N
            </text>
          </g>

          {/* Escala */}
          <g transform="translate(30, 525)">
            <line x1="0" y1="0" x2={Math.round(pixelsPorKm)} y2="0" stroke="#171625" strokeWidth="3" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke="#171625" strokeWidth="2" />
            <line x1={Math.round(pixelsPorKm)} y1="-4" x2={Math.round(pixelsPorKm)} y2="4" stroke="#171625" strokeWidth="2" />
            <text x={Math.round(pixelsPorKm / 2)} y="-6" textAnchor="middle" fontSize="9" fontWeight="900" fill="#171625">
              1 km em Patos
            </text>
          </g>
        </svg>
      </div>

      <p className="mapa-vagas-rodape-dica">
        <Icone nome="hand-click" tamanho={15} /> Toque em qualquer unidade no mapa para ver a lista de documentos e emitir seu protocolo.
      </p>
    </div>
  );
}
