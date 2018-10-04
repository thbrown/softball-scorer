class Hitter {

  constructor(plateAppearances) {
    this.hits = [];
    for(let i = 0; i < plateAppearances.length; i++) {
      hits.push(plateAppearances[i].result);
    }
  }

  hit() {
    var hit = Hitter.generateRandomInteger(0, plateAppearances.length);
    return this.hits[hit];
  }

  static generateRandomInteger(min, max) {
    // TODO: use secure random? A bad rng will likely affect the quality of the simulation
    return Math.floor(min + Math.random()*(max + 1 - min))
  }

}