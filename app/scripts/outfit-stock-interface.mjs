// Precision features for final-assembly neutral stocks. Clearance is applied to holes only.
// Caller owns all returned Manifold objects through own(). Does not modify source meshes.
export function createOutfitStockFitter(w,own,layout){
 const M=w.Manifold,box=(size,p)=>own(own(M.cube(size,true)).translate(p));
 const cylinder=(r,h,p,n=128)=>own(own(M.cylinder(h,r,r,n,true)).translate(p));
 const add=(a,b)=>own(a.add(b)),cut=(a,b)=>own(a.subtract(b));
 return stock=>{
  const waist=layout.waistPlane,foot=layout.footPlane,seat=layout.neckSeat,floor=layout.neckFloor;
  const xy=layout.waistMale.map(x=>x+2*layout.waistClearance);
  let upper=cut(stock['upper-body'],box([...xy,4.5],[0,0,waist+2.05]));
  const radius=(3+layout.neckClearance)/Math.cos(Math.PI/6);
  upper=cut(upper,cylinder(radius,seat-floor+.1,[0,layout.headY,(seat+floor+.1)/2],6));
  upper=cut(upper,own(own(M.cylinder(.51,radius,radius+.51/Math.cos(Math.PI/6),6,false)).translate([0,layout.headY,seat-.5])));
  let lower=add(stock['lower-body'],box([...layout.waistMale,layout.pegInsertion+.3],[0,0,waist+(layout.pegInsertion-.3)/2]));
  const result={'upper-body':upper};
  for(const [side,sign] of [['left',-1],['right',1]]){
   const x=sign*layout.footX;
   lower=cut(lower,cylinder(2+(layout[side==='left'?'footLeftClearance':'footRightClearance']??layout.footClearance),4.5,[x,layout.footY,foot+2.05]));
   result['shoe-'+side]=add(stock['shoe-'+side],cylinder(2,layout.pegInsertion+.3,[x,layout.footY,foot+(layout.pegInsertion-.3)/2]));
  }
  result['lower-body']=lower;return result;
 };
}
