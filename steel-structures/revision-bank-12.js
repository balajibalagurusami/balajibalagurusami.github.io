(()=>{
const L=['Foundation','Recognition','Structural intuition','Formula/detail','Reasoning trap','Application/retrieval'];
const K=['foundation','recognition','concept','formula','reasoning','application'];
const S={
'Introduction':[
'Tension members are primarily axial-force members carrying tensile force.','Truss ties, bridge members, bracing, hangers, suspension elements and rods are examples of tension-member applications.','A tension member can be materially efficient because its full section can participate in axial resistance away from connection effects.','End connections matter because bolt or weld layout can change the effective net section and create shear lag or eccentricity.','Checking only the gross member area is insufficient when the connection removes area or transfers force non-uniformly.','Chapter 7 therefore treats member strength together with the effect of the end connection.'
],
'Types of Tension Members':[
'The chapter includes single angles, double angles, channels, I- and T-sections, built-up members, rods, bars, strands and ropes.','A single angle connected through one leg is economical but can have an eccentric load path.','Double angles, channels and I-sections are used where larger force, stiffness or possible stress reversal must be accommodated.','Built-up tension members may use spacer plates or tack connections so their individual components act together.','Member form is selected from force level, connection geometry, stiffness and service requirements rather than from axial area alone.','Recognising the member type is the first step because different forms create different connection and shear-lag issues.'
],
'Design of Strands':[
'Wire ropes and strands are assembled from helically wound high-strength wires.','The chapter uses the approximate metallic area As = 0.6D² for a rope of nominal diameter D.','For rope elongation calculations, the chapter uses an equivalent elastic modulus of about 0.65E.','Rope capacity is less than the simple sum of individual wire capacities because all wires do not reach full strength simultaneously.','Using the solid-circle area πD²/4 as the metallic rope area would not follow the chapter approximation.','Pretensioning may be used where elongation must be limited.'
],
'Slenderness Ratio':[
'Tension-member slenderness is the unsupported length divided by the least radius of gyration.','The relevant radius of gyration is the least value because it corresponds to the most flexible lateral direction.','Slenderness limits in tension are used mainly to control lateral movement, vibration and erection-related overstress rather than Euler tensile buckling.','The IS 800 limits reproduced in the chapter depend on whether the member may reverse into compression or remains always in tension.','A tension member can satisfy axial strength yet still be too slender for satisfactory handling or service behaviour.','After strength is checked, the applicable slenderness limit is still verified as part of complete design.'
],
'Displacement of Tension Members':[
'For an axially loaded prismatic tension member in the elastic range, elongation is related to force, length, modulus and area.','The chapter uses Δ = PL/(EA) for elastic axial elongation.','Increasing member length increases elastic elongation when P, E and A remain unchanged.','Increasing area or elastic modulus reduces elongation for the same axial force and length.','Using factored collapse load for a serviceability elongation check would not follow the chapter treatment.','Tension-member displacement is checked using service loads because it is a serviceability consideration.'
],
'Behaviour of Tension Members':[
'The load-deformation response of a tension member follows the tensile stress-strain behaviour of its steel.','The chapter distinguishes engineering stress and strain from true stress and strain.','Typical ductile behaviour includes yielding, plastic extension, strain hardening and necking.','High-strength steels without a clear yield plateau may use the 0.2% offset proof stress to define a practical yield measure.','Necking occurs after substantial plastic deformation and is not the same event as first yielding.','Understanding tensile material behaviour explains why gross yielding can cause excessive elongation before fracture.'
],
'Modes of Failure':[
'The three principal tension-member limit states are gross-section yielding, net-section rupture and block shear.','Gross-section yielding is associated with large elongation of the member.','Net-section rupture is a fracture-type limit state at holes or other section reductions.','Block shear follows a combined tension-and-shear path around an end connection.','It is unsafe to assume that the largest gross area automatically prevents connection-region failure.','The design strength is governed by the least resistance among the applicable tension-member limit states.'
],
'Factors Affecting the Strength of Tension Members':[
'Bolt-hole formation, staggered holes, bearing effects, shear lag, geometry, ductility, fastener spacing, residual stress and initial crookedness can affect tension-member strength.','Shear lag means the stress distribution is non-uniform because only part of the section is directly connected.','Longer connections generally reduce shear-lag severity by allowing stress to spread more uniformly.','The chapter notes that drilled holes are preferable to punched holes where fatigue matters because punching creates local strain-hardening and residual effects.','A simple gross-area calculation cannot represent all connection-induced reductions in effective tension resistance.','Critical net-section assessment must include the actual hole pattern and connection geometry rather than only the unperforated section.'
],
'Angles Under Tension':[
'Angles are widely used as tension members in trusses, towers and bracing systems.','When a single angle is connected through one leg, the load path is eccentric and the outstanding leg is not directly connected.','Shear lag reduces the net-section effectiveness of the outstanding leg.','The chapter discusses effective-net-area formulations that distinguish connected and outstanding legs and account for connection length and geometry.','Assuming both legs are uniformly stressed immediately at a one-leg connection ignores the shear-lag effect.','Angle-tension design therefore checks the connection arrangement together with effective net-section resistance.'
],
'Other Sections':[
'Double angles, channels, T-sections and other rolled or built-up sections can also experience shear lag when only part of their cross-section is connected.','For partially connected sections, the effective net area can be smaller than the simple geometric net area.','The shear-lag concept used for single angles therefore extends to several other section forms.','Hollow sections connected through a single concentric gusset are discussed using a shear-lag distance to estimate effectiveness.','Being symmetric as a rolled shape does not guarantee uniform connection stress if only part of the section receives the load directly.','The connection layout must be considered before treating the full net area as effective.'
],
'Tension Rods':[
'Threaded rods are simple secondary tension members used as sag rods, wall ties, hangers and tie rods.','The chapter illustrates sag rods supporting purlins and vertical ties supporting girts or balconies.','Tie rods can also be used to resist arch thrust.','Pretension is often applied to diagonal wind-bracing rods to reduce slack, deflection and vibration.','A slender rod intended only for tension should not be assumed to provide reliable compression resistance after the load reverses.','The structural role and need for pretension should be identified before sizing and detailing a tension rod.'
],
'Design of a Tension Member':[
'The design sequence first estimates required net area from rupture and required gross area from gross-section yielding.','A trial rolled section is then selected before the connection is designed.','After bolts or welds are arranged, the actual net area and governing tension strengths are checked.','If capacity is inadequate or excessively high, the trial section and connection are revised iteratively.','Checking only one resistance equation does not complete tension-member design because gross yielding, net rupture, block shear and connection effects may compete.','The final member also has to satisfy the applicable slenderness requirement.'
],
'Lug Angles':[
'A lug angle is a short auxiliary angle placed near the end connection of a heavily loaded angle or channel.','Its purpose is to transfer part of the force through the outstanding portion of the connected member.','By sharing force with the outstanding part, a lug angle can shorten the required main connection length.','The chapter notes that lug angles complicate fabrication compared with a simpler direct connection.','A lug angle should not be added automatically when a wider-leg angle or staggered bolt layout can give a satisfactory connection.','Lug-angle use is therefore a connection-detailing choice balancing force transfer, connection length and fabrication simplicity.'
],
'Splices':[
'Tension-member splices are required when available member length is insufficient or when transport and erection require joining.','The splice should avoid eccentric force transfer as far as practicable.','Splice cover plates or welded details should develop the tensile strength required of the main member.','Packing thickness can reduce bolt capacity and has to be considered where it occurs.','A splice is not satisfactory merely because the connected pieces physically meet; it must transfer the required axial force safely.','Good splice detailing maintains an essentially direct load path through the joined tension member.'
],
'Gussets':[
'Gusset plates connect truss or bracing members and transmit their forces into the main joint or member.','Gusset size and shape depend on member directions, edge-distance requirements and connection geometry.','Member force lines should ideally meet at a common point to avoid secondary moments.','Gussets may need checks for direct stress, bending, shear, block shear and local stability.','A thin gusset can be unsafe even when its average direct stress is acceptable because local buckling or other combined actions may govern.','Adequate gusset thickness and a clear force path are essential connection-design considerations.'
],
'Fatigue Effects':[
'Fatigue becomes important when a tension member experiences many stress cycles or a large stress range.','The chapter notes that fatigue is often negligible for ordinary building tension members but can govern bridge tension members.','Stress concentration at connection details is especially important when repeated loading is present.','Where fatigue matters, details that reduce stress concentration and slip are preferred; properly designed HSFG connections are cited in that context.','A connection adequate for one static peak load is not automatically fatigue-resistant under many repeated cycles.','The need for a fatigue check is identified from the loading history and detail sensitivity, not merely from the fact that the member is in tension.'
],
'Examples':[
'The worked examples include net-area calculations for drilled and punched holes and for staggered bolt paths.','Examples also cover tension strength of plates and angles and block-shear checks.','The chapter applies the design procedure to sag rods, roof-truss diagonals and lug-angle connections.','Cable sizing examples include elongation limits in addition to strength.','A recurring worked-example task is to identify the critical net path rather than assume the straightest path always governs.','The examples repeatedly compare yielding, rupture and connection-related capacities to identify the governing resistance.'
],
'Summary':[
'The summary revisits gross yielding, net rupture and block shear as the principal tension-member strength modes.','It also revisits net-area reduction caused by holes and connection layout.','Fabrication, bearing, shear lag, geometry, ductility, residual stress and initial crookedness are included among strength-influencing effects.','Code methods for effective area are used to translate non-uniform connection behaviour into design resistance.','The summary does not reduce tension-member design to one area-times-stress equation.','The complete chapter logic combines member form, connection effects, strength checks, slenderness and practical detailing.'
],
'Exercises':[
'The Chapter 7 exercises include net-area calculations for chain and staggered bolt patterns.','They require tensile-strength checks of plates and angles rather than definition recall alone.','Bolted and welded tension-member design problems are included.','The exercise set also includes bridge members, sag rods and a roof-truss diagonal with its gusset and lug angle.','Exercise solutions must account for actual connection geometry rather than ignore holes and shear lag.','The exercise set is intended to practise complete member-and-connection design decisions.'
],
'Review Questions':[
'The review questions cover types and uses of tension members, including rods, ropes and strands.','Slenderness and elongation are included in the review scope.','Engineering versus true stress-strain behaviour and the principal failure modes are tested.','Stress concentration, drilled versus punched holes, staggered net area, bearing and shear lag are review topics.','Geometry, ductility, residual stress and initial crookedness are also included in the review questions.','The review set is therefore a retrieval check across both material behaviour and connection-controlled tension-member design.'
]
};
const bad=[
'The source states that this topic has no effect on tension-member behaviour or design.',
'The governing idea is to ignore the connection and check only the unperforated gross area.',
'The chapter treats this as a concrete-only phenomenon unrelated to structural steel.'
];
const out={};
for(const [topic,facts] of Object.entries(S)){
  out['7:'+topic]=facts.map((fact,i)=>({
    id:`ch7-deep-${topic.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${i+1}`,
    title:L[i],level:K[i],kind:i===3?'formula/detail':(i===5?'application':'concept'),
    q:`${L[i]} check — ${topic}: which statement matches the Chapter 7 source?`,
    choices:[fact,...bad],answer:0,explanation:fact,
    source:'N. Subramanian, Design of Steel Structures, Chapter 7; Chapter 7 Oxford presentation where applicable'
  }));
}
for(const [key,items] of Object.entries(out)){
  window.REVISION_BANK[key]=[...(window.REVISION_BANK[key]||[]),...items];
}
})();