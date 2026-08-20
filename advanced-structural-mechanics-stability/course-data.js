const ASMS_COURSE = [
  {n:1,title:'Vectors',sub:'Indicial notation and vectors',ref:'R1',topics:['Indicial Notation','Vectors']},
  {n:2,title:'Vector Algebra',sub:'Vector algebra, dot/cross products and matrix manipulation',ref:'R1',topics:['Vector Algebra','Dot Product and Cross Product','Manipulating Vectors as matrices']},
  {n:3,title:'Idea of Stress',sub:'Traction, stress tensor, traction–stress relationship and stresses on a plane',ref:'R1 and T1',topics:['Traction','Definition of stress as a tensor','Traction to stress relationship','Stresses on a plane']},
  {n:4,title:'Stress on a plane and Principal Stress',sub:'Stress transformation, principal stress, eigenvalue problem and invariants',ref:'R1 and T1',topics:['Continuation of stress on a plane','Principal Stress','As an Eigen Value Problem','Stress Invariants']},
  {n:5,title:'Stress-Strain Relationship',sub:'Strain and generalized Hooke’s law',ref:'T1',topics:['Strain','Generalized Hookes Law']},
  {n:6,title:'Equilibrium and Compatibility',sub:'Equilibrium equations and compatibility',ref:'T1',topics:['Equilibrium equations','Compatibility']},
  {n:7,title:'Airy’s Stress Function and Applications',sub:'Airy stress function and 2D/3D problems',ref:'T1',topics:['Airys stress Function','2D Problems','3D Problems']},
  {n:8,title:'Orthotropic Materials',sub:'3D problems, constitutive relationship and rotation/reduction of constants',ref:'T1 and Class Notes',topics:['Continuation of 3D Problem','Constitutive Relationship','Rotation and Reduction of the constants']},
  {n:9,title:'Plasticity',sub:'Deviatoric stress, principal axes, yield criteria and plastic flow',ref:'T1',topics:['Deviatoric Stress','Principal Stress Axes','Yield Criteria','Introduction to Plastic Flow Theory']},
  {n:10,title:'Introduction to Torsion',sub:'1D torsion, warping and shear centre concept',ref:'Class Notes',topics:['Equation of Torsion in 1d','Warping','Concept of Shear centre']},
  {n:11,title:'Elastic Buckling Beam-Columns',sub:'Euler buckling, effective length and beam-column equation',ref:'T2',topics:['Euler’s Buckling','Effective length and issues in design','Basic Equation of Beam-Columns']},
  {n:12,title:'Beam-Columns with elastic support',sub:'Elastic support equations and buckling from beam-column equations',ref:'T2',topics:['Equations for elastic support','Buckling based on beam column equations']},
  {n:13,title:'Critical Loads using beam-columns',sub:'Elastic supports and application to frames',ref:'T2',topics:['Buckling with elastic supports','Application to frames']},
  {n:14,title:'Shear Centre',sub:'Shear flow and shear centre for simple cross-sections',ref:'Class Notes',topics:['Calculation of Shear flow','Calculation of Shear Center','Shear Centers for simple cross-sections']},
  {n:15,title:'Lateral Torsional Buckling',sub:'LTB equations for various cases',ref:'T2',topics:['Equations for lateral torsional buckling','For various cases']},
  {n:16,title:'Buckling and Post Buckling behaviour of Plates',sub:'Torsional buckling continuation and plate buckling introduction',ref:'T2',topics:['Continuation of torsional Buckling','Introduction to Buckling of plates']}
];

const ASMS_MILESTONES = [
  {name:'Quiz',date:'2026-08-10',end:'2026-08-20',weight:'10%',type:'Online',scope:'Course quiz window'},
  {name:'Assignment',date:'2026-08-27',end:'2026-09-07',weight:'25%',type:'Online',scope:'Assignment window'},
  {name:'Mid-Semester Test',date:'2026-09-19',weight:'25%',type:'Closed book',duration:'2 hours',scope:'Contact Sessions 1–8'},
  {name:'Comprehensive Exam',date:'2026-12-05',weight:'40%',type:'Open book',duration:'2½ hours',scope:'All topics'}
];

const ASMS_SOURCE_SCOPE = {
  uploaded_text_scope:'The 16-session inventory, references, learning outcomes and evaluation dates come from the uploaded ST ZG552 course handout. Detailed source-grounded quiz content is currently strongest for Session 3 because the supplied lecture screenshots explicitly show the 3D stress tensor cube, the sample stress tensor and the “Traction on a given plane” diagram. Sessions 1, 2 and 4 include clearly labelled prerequisite/model-supplement questions so you can keep moving without confusing them with uploaded-source coverage.',
  strict_rule:'A topic counts as source-grounded only when its lesson is directly supported by the uploaded handout detail or lecture screenshots. Supplemental bridge lessons remain available but do not increase strict source coverage.'
};

const ASMS_DEEP = {
  '1:Indicial Notation':{
    step:'Foundation bridge',grounded:false,
    q:'In a symbol such as aᵢ, what is the main job of the index i?',
    o:['It labels a component or direction','It means a is squared','It is a unit of force','It always means time'],a:0,
    e:'Indicial notation uses indices such as i, j and k to identify components. This is the notation language used later for vectors and tensors.',
    source:'ST ZG552 Session 1 topic + standard prerequisite bridge (model supplement)'
  },
  '1:Vectors':{
    step:'Foundation bridge',grounded:false,
    q:'Which quantity needs both magnitude and direction?',
    o:['Mass','Temperature','Force','Density'],a:2,
    e:'A force is a vector: it has a magnitude and a direction. This is the basic idea behind resolving a 3D force into x, y and z components.',
    source:'ST ZG552 Session 1 topic + standard prerequisite bridge (model supplement)'
  },
  '2:Vector Algebra':{
    step:'Foundation bridge',grounded:false,
    q:'If F = [Fₓ, Fᵧ, F_z]ᵀ, what do the three entries represent?',
    o:['Three unrelated forces','Components of one force along x, y and z','Three stress tensors','Three material properties'],a:1,
    e:'The entries are the components of one vector expressed along the coordinate axes.',
    source:'ST ZG552 Session 2 topic + standard prerequisite bridge (model supplement)'
  },
  '2:Dot Product and Cross Product':{
    step:'Foundation bridge',grounded:false,
    q:'Which product of two vectors gives a scalar?',
    o:['Dot product','Cross product','Outer product','Matrix transpose'],a:0,
    e:'The dot product returns a scalar. The cross product returns a vector perpendicular to the two input vectors.',
    source:'ST ZG552 Session 2 topic + standard prerequisite bridge (model supplement)'
  },
  '2:Manipulating Vectors as matrices':{
    step:'Foundation bridge',grounded:false,
    q:'A 3D vector written as a column matrix normally has what size?',
    o:['1 × 1','2 × 2','3 × 1','3 × 3'],a:2,
    e:'A 3D vector has three components, so a common matrix form is a 3 × 1 column vector.',
    source:'ST ZG552 Session 2 topic + standard prerequisite bridge (model supplement)'
  },
  '3:Traction':{
    step:'Lecture screenshot',grounded:true,
    q:'In the “Traction on a given plane” slide, the traction vector t is split into which two parts?',
    o:['Normal and shear parts','x and y only','Body and surface forces','Elastic and plastic parts'],a:0,
    e:'The slide states “Traction = normal part + shear part.” It labels the normal traction as σₙ and the shear traction as τ.',
    source:'Uploaded lecture screenshot — “Traction on a given plane”'
  },
  '3:Definition of stress as a tensor':{
    step:'Lecture screenshot',grounded:true,
    q:'How many entries are displayed in the 3D stress tensor matrix shown on the lecture slide?',
    o:['3','6','9','12'],a:2,
    e:'The displayed stress tensor is a 3 × 3 matrix, so it contains 9 displayed entries: σxx, σxy, σxz, σyx, σyy, σyz, σzx, σzy and σzz.',
    source:'Uploaded lecture screenshot — 3D stress tensor cube and matrix'
  },
  '3:Traction to stress relationship':{
    step:'Lecture screenshot',grounded:true,
    q:'What vector identifies the orientation of the imaginary cut plane in the traction slide?',
    o:['t','n','τ','P'],a:1,
    e:'The slide explicitly labels n as the orientation of the plane. In continuum mechanics the plane normal is what selects the plane on which traction is evaluated.',
    source:'Uploaded lecture screenshot — “Traction on a given plane”'
  },
  '3:Stresses on a plane':{
    step:'Lecture screenshot',grounded:true,
    q:'On the x-face of the stress cube, which component is normal to the face?',
    o:['σxx','σxy','σxz','σyz'],a:0,
    e:'The x-face has normal direction x. Therefore σxx acts normal to that face, while σxy and σxz act tangentially as shear components.',
    source:'Uploaded lecture screenshot — labelled 3D stress cube'
  },
  '4:Continuation of stress on a plane':{
    step:'Concept bridge',grounded:false,
    q:'If you rotate the plane passing through the same stressed point, what generally happens to the traction vector?',
    o:['It generally changes','It must stay identical','It becomes zero','It becomes a scalar'],a:0,
    e:'Traction depends on the orientation of the plane. Changing the plane normal changes the traction resolved on that plane.',
    source:'ST ZG552 Session 4 topic + standard continuum-mechanics bridge (model supplement)'
  },
  '4:Principal Stress':{
    step:'Concept bridge',grounded:false,
    q:'What is special about a principal plane?',
    o:['Shear traction is zero on it','Normal stress is always zero','It exists only in 2D','Its normal vector has zero length'],a:0,
    e:'A principal plane is oriented so that traction is purely normal: the shear component vanishes. The corresponding normal stress is a principal stress.',
    source:'ST ZG552 Session 4 topic + standard continuum-mechanics bridge (model supplement)'
  },
  '4:As an Eigen Value Problem':{
    step:'Concept bridge',grounded:false,
    q:'In the principal-stress eigenvalue form σn = λn, what does λ represent?',
    o:['A principal stress','A shear strain','A body force','A coordinate axis'],a:0,
    e:'The eigenvalues of the stress tensor are the principal stresses, and the associated eigenvectors give the principal directions.',
    source:'ST ZG552 Session 4 topic + standard continuum-mechanics bridge (model supplement)'
  },
  '4:Stress Invariants':{
    step:'Concept bridge',grounded:false,
    q:'Why are stress invariants called “invariants”?',
    o:['Their values do not change when the coordinate axes are rotated','They are always zero','They exist only for steel','They are constant through time for every problem'],a:0,
    e:'Stress invariants are combinations of tensor components that are independent of the chosen coordinate orientation.',
    source:'ST ZG552 Session 4 topic + standard continuum-mechanics bridge (model supplement)'
  }
};
