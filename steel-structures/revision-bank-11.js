(()=>{
const L=['Foundation','Recognition','Structural intuition','Formula/detail','Reasoning trap','Application/retrieval'];
const K=['foundation','recognition','concept','formula','reasoning','application'];
const S={
'Introduction':[
'Welding joins metal pieces by heating them to a plastic or fluid state so fusion occurs.','Chapter 6 covers structural welding processes, welded-joint behaviour and design procedures.','The chapter connects fabrication practice with the structural behaviour of welded joints.','Arc and gas welding are part of the historical development introduced before structural design topics.','Welding is not treated as defect-free; joint quality and structural behaviour still require design and inspection.','The chapter also includes tubular joints, earthquake-driven connection improvements and adhesive joining.'
],
'Welding Processes':[
'Structural welding is described as predominantly electric.','In arc welding an electric arc forms across the small gap between electrode and base metal and melts the metals locally.','SMAW, SAW, GMAW, FCAW, ESW and stud welding are processes listed for structural steel work.','Process selection depends on factors such as penetration, deposition rate, welding position, access, steel composition, thickness and cost.','Different structural welding processes are not interchangeable in every position and access condition.','A rational process choice matches the fabrication situation and required weld quality rather than using one process for every joint.'
],
'Welding Electrodes':[
'Electrode and weld-metal properties should be matched suitably to the base metal.','Coated electrodes help shield molten metal from gases and oxidation.','Poor shielding can contribute to defects such as porosity and brittleness.','The SMAW Exxxbc classification conveys strength, welding position and coating or operating characteristics.','Electrode selection affects weld quality and mechanical performance, not merely arc initiation.','A suitable electrode is chosen from the required material compatibility and welding conditions.'
],
'Advantages of Welding':[
'Welding can eliminate many connection holes needed for bolting or riveting.','Welding can join difficult geometries and produce clean, continuous-looking details.','Welded details can reduce some connection material compared with mechanically fastened arrangements.','Welding may introduce residual stress, distortion and defects and therefore needs skilled workmanship and inspection.','It is incorrect to assume that welding has no disadvantages or quality-control needs.','Field conditions and access can make welding quality control more difficult than ideal shop welding.'
],
'Types and Properties of Welds':[
'The four main structural weld types identified are groove, fillet, slot and plug welds.','Fillet welds are widely used for lap and T-joints.','Groove welds are used where aligned members or penetration through a butt, corner or edge-type joint is required.','Groove-weld geometry includes penetration, root opening, bevel form and backing details.','Weld type and joint type are different classifications and should not be confused.','Weld form and geometry are selected to suit force transfer, fabrication and required penetration.'
],
'Types of Joints':[
'The five basic welded-joint configurations are butt, lap, T, corner and edge joints.','A lap joint is formed by overlapping the connected parts.','Joint selection depends on member size and shape, loading, welding access and relative cost.','Joint geometry is distinct from weld type; for example, a fillet weld may occur in more than one joint configuration.','It is unsafe to choose a joint geometry without considering force flow and welding access.','A practical joint configuration balances structural force transfer, fabrication access and economy.'
],
'Control of Shrinkage and Distortion':[
'Hot deposited weld metal contracts as it cools and solidifies.','Restrained contraction can generate residual stresses, while incomplete restraint can allow distortion.','Distortion may appear as angular change or longitudinal bowing.','Control measures include reducing unnecessary weld volume, arranging welds symmetrically and planning the welding sequence.','Random sequencing and excessive weld volume can worsen rather than eliminate shrinkage effects.','Clamps or jigs, balanced shrinkage forces and suitable sequence planning are part of the distortion-control toolbox.'
],
'Weld Symbols':[
'Standard weld symbols use a reference line, arrow and tail convention to communicate requirements.','A weld symbol below the reference line identifies the arrow side in the convention shown.','A weld symbol above the reference line identifies the other side.','A circle indicates weld-all-around and a flag-like pennant indicates a field weld.','The symbol location above or below the reference line is meaningful and is not interchangeable.','Weld symbols compactly communicate weld type, side, size, length, pitch, contour and supplementary information.'
],
'Weld Specifications':[
'Minimum fillet-weld size is specified to help achieve adequate fusion and reduce cracking risk.','The minimum fillet size is related to the thickness of the thicker connected part.','Maximum edge-weld limits help prevent melting away a plate corner and loss of effective throat.','Specifications also address effective length, overlap, intermittent-weld spacing and long-joint effects.','Making every weld as large as possible is not the objective of weld specification.','Good weld specification balances adequate fusion, effective resistance and practical detailing.'
],
'Effective Areas of Welds':[
'For groove and fillet welds, effective weld area is obtained from effective throat multiplied by effective length.','The effective throat represents the minimum expected resisting plane through the weld rather than merely the visible leg dimension.','Increasing effective length while keeping effective throat unchanged increases effective weld area proportionally.','Plug welds are treated using their corresponding effective area rather than a fillet-throat line model.','Visible deposited metal should not automatically be assumed fully effective for resistance.','Design uses effective throat and effective length because those dimensions represent the resisting weld section.'
],
'Design of Welds':[
'Simplified weld analysis commonly treats weld metal as homogeneous, isotropic and elastic.','Connected parts are commonly idealized as rigid relative to the weld group in the simplified model.','Residual-stress and local-shape effects may be neglected in the simplified external-force calculation.','Groove-weld checks use effective area together with appropriate weld or parent-metal strength; other weld types use their corresponding effective geometry.','The simplified assumptions do not mean residual stresses or local effects never exist physically.','The design workflow is to establish effective geometry, determine demand and compare it with the appropriate weld resistance.'
],
'Simple Joints':[
'The chapter applies weld design to truss-member, angle-seat, web-angle, end-seat and end-plate details.','A simple welded-joint analysis begins by identifying the force transferred through the joint.','If the force is eccentric to the weld-group centroid, a moment effect must also be considered.','Effective weld length and throat are key sizing variables used to provide adequate weld-group capacity.','Calling a joint simple does not justify ignoring eccentricity when it exists.','The recurring design principle is to trace the force path, determine the resultant action and size the weld group accordingly.'
],
'Moment Resistant Connections':[
'Moment-resistant welded connections transfer bending moment together with shear and sometimes axial force.','An eccentric force is represented by a direct force through the weld-group centroid plus a moment.','The combined demand is checked at the most highly loaded part of the weld group.','For an eccentric force P acting at eccentricity e, the associated moment is represented by M = P e.','Treating an eccentric force as a concentric force with no moment would violate the intended force representation.','Brackets, seat details and related weld groups are analysed by combining direct and moment effects.'
],
'Continuous Beam-to-Column Connections':[
'A continuous beam-to-column connection is treated as a rigid-frame joint with full moment transfer and little relative rotation.','Local joint elements such as the column region and stiffeners must be proportioned so they do not fail prematurely.','The chapter illustrates flange-to-column welding, column stiffeners, T-stiffeners and seat or top-plate details.','Connection deformation must remain compatible with the intended continuous or rigid-frame behaviour.','A strong beam alone does not guarantee a strong beam-to-column joint if local connection elements are weak.','The design objective is to develop the required frame force transfer without a premature local weak link.'
],
'Continuous Beam-to-Beam Connections':[
'When a beam frames transversely into a supporting beam, the connection must transfer shear.','The connection may also need to transfer tensile flange force across the supporting web.','Rigidly attached intersecting tension flanges can create biaxial stress and increase brittle-fracture risk.','Top plates, web-welded plates and T-seat arrangements are among the details shown depending on flange elevation.','It is unsafe to assume every continuous beam-to-beam connection carries shear only.','The detail should provide a clear path for shear and any required flange force while controlling harmful local stress states.'
],
'Beam Column Splices':[
'Beam and column splices are needed because practical member length, transport and erection may require members to be joined.','A welded beam splice may use direct full-penetration welding or shop-welded splice plates with field bolting.','Column splices may use milled bearing ends, splice angles or plates, groove welds, end plates and local stiffeners.','Column splice locations are commonly selected near floor level in regions of relatively low bending moment.','A splice is not merely an erection marker; it must transfer the required member actions across the break.','Good splice design restores the required structural continuity while respecting fabrication and erection constraints.'
],
'Tubular Connections':[
'Tubular and hollow sections commonly require welding with careful end preparation at their joints.','Force transfer into a hollow-section wall can cause local deformation and stress concentration.','Local joint behaviour may govern even when the connected tubular members themselves are strong.','The curved or thin-walled receiving surface makes local force introduction an important design issue.','Efficient hollow-section member behaviour does not guarantee adequate joint capacity without local checks.','Tubular connection design therefore focuses on end preparation, local wall behaviour and stress concentration.'
],
'Recent Developments in Connection Design':[
'The section is motivated by damage observed in moment frames during the 1994 Northridge and 1995 Kobe earthquakes.','Cracking was observed around beam-flange welds and adjacent beam or column regions.','Contributing factors include stress concentration from backing details, weld-metal toughness, member size, strength variability, construction quality and triaxial restraint.','The chapter groups improvement strategies into toughening, strengthening and weakening schemes.','Member strength alone cannot guarantee seismic joint performance if connection detailing and weld quality are poor.','Modern moment-connection improvements often combine more than one strategy to control toughness, force demand and yielding location.'
],
'Application of Adhesives':[
'Structural adhesive joints transfer load through cohesion within the adhesive layer and adhesion at the steel interface.','Cohesive cracking occurs within the adhesive layer.','Adhesive or interface cracking occurs at the adhesive-to-steel interface, and combined failure is also possible.','The chapter presents adhesives as an emerging alternative or supplement to bolts and welds.','Structural adhesives have historically been limited by calculation-method and long-term-performance knowledge, not because they have no bond mechanism.','Their structural use requires consideration of both internal adhesive behaviour and interface performance.'
],
'Examples':[
'The worked examples establish effective weld geometry before checking resistance.','Examples include groove and fillet welds, direct and eccentric weld groups, brackets, beam joints and splices.','Eccentrically loaded examples resolve direct-force and moment effects on the weld group.','A recurring workflow is effective geometry, weld strength, demand resolution and governing capacity comparison.','Worked examples do not assume every weld is infinitely strong or ignore eccentricity.','The examples connect fabrication dimensions and force-path analysis to an explicit strength check.'
],
'Summary':[
'The chapter summary revisits welding-process selection, weld advantages and defects.','Shrinkage and distortion control, weld and joint types, symbols and specifications are included in the summary.','Simple and moment-resistant connections as well as beam and column splices are revisited.','Earthquake-driven connection improvements and adhesive joining are also part of the chapter summary.','The summary acknowledges that a single chapter cannot show every possible welded connection form.','The chapter as a whole integrates welding technology, detailing or quality control and structural connection design.'
],
'Exercises':[
'The Chapter 6 exercises require design and checking rather than simple recall.','The exercise set includes groove-welded plate checks and fillet-weld sizing.','Eccentric weld groups and brackets are included so direct and moment effects must be handled.','The exercises progress from basic weld strength to complete force-transfer behaviour in structural connection details.','A successful exercise solution cannot ignore effective weld geometry or the force path.','The exercise objective is to develop the ability to size and check welded structural joints under realistic actions.'
],
'Review Questions':[
'The review questions test welding-process abbreviations and process selection.','Electrode designation, weld and joint types and backing or groove details are part of the review.','Weld symbols, specifications and effective dimensions are directly tested.','Shrinkage, distortion, connection analysis and connection design are also included in the review scope.','The review is not limited to fabrication vocabulary; structural design principles are included.','The review questions are intended as retrieval practice across both welding technology and welded-connection design.'
]
};
const bad=[
'This subject has no influence on structural behaviour or fabrication.',
'The chapter states that only appearance matters for this topic.',
'The opposite statement is given as the governing rule in the source.'
];
const out={};
for(const [topic,facts] of Object.entries(S)){
  out['6:'+topic]=facts.map((fact,i)=>({
    id:`ch6-deep-${topic.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${i+1}`,
    title:L[i],level:K[i],kind:i===3?'formula/detail':(i===5?'application':'concept'),
    q:`${L[i]} check — ${topic}: which statement matches the Chapter 6 source?`,
    choices:[fact,...bad],answer:0,explanation:fact,source:'N. Subramanian, Design of Steel Structures, Chapter 6; Chapter 6 Oxford presentation where applicable'
  }));
}
Object.assign(window.REVISION_BANK,out);
})();